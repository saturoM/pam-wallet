"""PAM: deposit captured, then seamless bet/settle. Only PAM writes the ledger."""
from __future__ import annotations

from dataclasses import dataclass
from enum import Enum

from ledger import GateBlocked, InsufficientFunds, Ledger, LedgerError, Posting


def cash_acct(player_id: str) -> str:
    return f"player_cash:{player_id}"


def in_play_acct(player_id: str) -> str:
    return f"bets_in_play:{player_id}"


def withdraw_acct(player_id: str) -> str:
    return f"withdraw_in_flight:{player_id}"


HOUSE = "house"
MIN_DEPOSIT_CENTS = 1000
MAX_DEPOSIT_CENTS = 20_000
DAILY_DEPOSIT_LIMIT_CENTS = 10_000


class DepositStatus(str, Enum):
    PENDING = "pending"
    CAPTURED = "captured"
    FAILED = "failed"


class RoundStatus(str, Enum):
    OPEN = "open"
    SETTLED = "settled"


class WithdrawStatus(str, Enum):
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"


@dataclass
class Deposit:
    deposit_id: str
    player_id: str
    amount_cents: int
    status: DepositStatus
    psp_transaction_id: str | None = None


@dataclass
class Round:
    round_id: str
    player_id: str
    stake_cents: int
    status: RoundStatus
    payout_cents: int | None = None


@dataclass
class Withdrawal:
    withdraw_id: str
    player_id: str
    amount_cents: int
    status: WithdrawStatus
    psp_transaction_id: str | None = None


@dataclass
class CashierView:
    available_cents: int
    in_play_cents: int
    deposit_status: str | None
    withdraw_pending_cents: int = 0


class Pam:
    """Game and cashier never post. They call PAM; cashier is a read model."""

    def __init__(self) -> None:
        self.ledger = Ledger()
        self._deposits: dict[str, Deposit] = {}
        self._psp_txn_to_deposit: dict[str, str] = {}
        self._rounds: dict[str, Round] = {}
        self._withdrawals: dict[str, Withdrawal] = {}
        self._psp_txn_to_withdraw: dict[str, str] = {}
        self._status: dict[str, str] = {}
        self._kyc: dict[str, bool] = {}
        self._kyc_cases: dict[str, dict] = {}
        self._kyc_status: dict[str, str] = {}

    def set_player_status(self, player_id: str, status: str) -> None:
        self._status[player_id] = status

    def submit_kyc(self, player_id: str, kyc_id: str) -> dict:
        existing = self._kyc_cases.get(kyc_id)
        if existing:
            return existing
        if self._kyc.get(player_id, False):
            raise GateBlocked("KYC_ALREADY_VERIFIED", "KYC already approved")
        pending = next(
            (
                c
                for c in self._kyc_cases.values()
                if c["player_id"] == player_id and c["status"] == "pending"
            ),
            None,
        )
        if pending:
            raise GateBlocked("KYC_PENDING", f"KYC {pending['kyc_id']} still awaiting review")
        case = {"kyc_id": kyc_id, "player_id": player_id, "status": "pending"}
        self._kyc_cases[kyc_id] = case
        self._kyc_status[player_id] = "pending"
        return case

    def review_kyc(self, kyc_id: str, status: str) -> dict:
        case = self._kyc_cases.get(kyc_id)
        if case is None:
            raise LedgerError(f"unknown kyc_id {kyc_id}")
        if case["status"] in ("approved", "rejected"):
            return case
        if status not in ("approved", "rejected"):
            raise LedgerError(f"unknown kyc status {status}")
        case["status"] = status
        player_id = case["player_id"]
        if status == "approved":
            self._kyc[player_id] = True
            self._kyc_status[player_id] = "approved"
        else:
            self._kyc[player_id] = False
            self._kyc_status[player_id] = "rejected"
        return case

    def used_deposit_cents(self, player_id: str) -> int:
        return sum(
            d.amount_cents
            for d in self._deposits.values()
            if d.player_id == player_id and d.status != DepositStatus.FAILED
        )

    def _assert_open(self, player_id: str, action: str) -> None:
        st = self._status.get(player_id, "active")
        if st == "self_excluded":
            raise GateBlocked("SELF_EXCLUDED", f"{action} blocked: {player_id} is self-excluded")
        if st == "frozen":
            raise GateBlocked("FROZEN", f"{action} blocked: {player_id} is frozen (no new entries)")

    def request_deposit(self, player_id: str, amount_cents: int, deposit_id: str) -> Deposit:
        if amount_cents <= 0:
            raise LedgerError("amount must be positive")
        existing = self._deposits.get(deposit_id)
        if existing:
            return existing
        self._assert_open(player_id, "deposit")
        if amount_cents < MIN_DEPOSIT_CENTS:
            raise GateBlocked("AMOUNT_MIN", f"deposit below min ${MIN_DEPOSIT_CENTS // 100}")
        if amount_cents > MAX_DEPOSIT_CENTS:
            raise GateBlocked("AMOUNT_MAX", f"deposit above max ${MAX_DEPOSIT_CENTS // 100}")
        remaining = DAILY_DEPOSIT_LIMIT_CENTS - self.used_deposit_cents(player_id)
        if amount_cents > remaining:
            raise GateBlocked(
                "RG_DEPOSIT_LIMIT",
                f"daily deposit remaining ${remaining / 100:.2f}",
            )
        dep = Deposit(
            deposit_id=deposit_id,
            player_id=player_id,
            amount_cents=amount_cents,
            status=DepositStatus.PENDING,
        )
        self._deposits[deposit_id] = dep
        return dep

    def on_psp_webhook(
        self,
        deposit_id: str,
        status: str,
        psp_transaction_id: str,
    ) -> Deposit:
        dep = self._deposits.get(deposit_id)
        if dep is None:
            raise LedgerError(f"unknown deposit_id {deposit_id}")

        mapped = self._psp_txn_to_deposit.get(psp_transaction_id)
        if mapped and mapped != deposit_id:
            raise LedgerError("psp_transaction_id already bound to another deposit")

        if dep.status in (DepositStatus.CAPTURED, DepositStatus.FAILED):
            return dep

        if status == "captured":
            applied = self.ledger.post(
                Posting(
                    debit="cash_at_psp",
                    credit=cash_acct(dep.player_id),
                    amount_cents=dep.amount_cents,
                    idempotency_key=f"captured:{deposit_id}",
                    event="deposit_captured",
                )
            )
            if applied:
                dep.status = DepositStatus.CAPTURED
                dep.psp_transaction_id = psp_transaction_id
                self._psp_txn_to_deposit[psp_transaction_id] = deposit_id
            return dep

        if status == "failed":
            dep.status = DepositStatus.FAILED
            return dep

        raise LedgerError(f"unknown psp status {status}")

    def place_bet(self, player_id: str, round_id: str, stake_cents: int) -> Round:
        """Seamless: game calls PAM. Stake leaves player_cash into bets_in_play."""
        if stake_cents <= 0:
            raise LedgerError("stake must be positive")
        existing = self._rounds.get(round_id)
        if existing:
            if existing.player_id != player_id or existing.stake_cents != stake_cents:
                raise LedgerError("round_id already used with a different intent")
            return existing
        self._assert_open(player_id, "bet")
        available = self.ledger.signed_balance(cash_acct(player_id))
        if stake_cents > available:
            raise InsufficientFunds(
                f"need {stake_cents} have {available}"
            )
        applied = self.ledger.post(
            Posting(
                debit=cash_acct(player_id),
                credit=in_play_acct(player_id),
                amount_cents=stake_cents,
                idempotency_key=f"bet:{round_id}",
                event="bet",
            )
        )
        rnd = Round(
            round_id=round_id,
            player_id=player_id,
            stake_cents=stake_cents,
            status=RoundStatus.OPEN,
        )
        if applied:
            self._rounds[round_id] = rnd
        return rnd

    def settle(self, round_id: str, payout_cents: int) -> Round:
        """payout_cents = money returned to player_cash (0 lose, stake void, stake+win win)."""
        if payout_cents < 0:
            raise LedgerError("payout cannot be negative")
        rnd = self._rounds.get(round_id)
        if rnd is None:
            raise LedgerError(f"unknown round_id {round_id}")
        if rnd.status == RoundStatus.SETTLED:
            return rnd

        cash = cash_acct(rnd.player_id)
        hold = in_play_acct(rnd.player_id)
        stake = rnd.stake_cents

        if payout_cents == 0:
            self.ledger.post(
                Posting(
                    debit=hold,
                    credit=HOUSE,
                    amount_cents=stake,
                    idempotency_key=f"settle:{round_id}",
                    event="settle_lose",
                )
            )
        elif payout_cents == stake:
            self.ledger.post(
                Posting(
                    debit=hold,
                    credit=cash,
                    amount_cents=stake,
                    idempotency_key=f"settle:{round_id}",
                    event="settle_void",
                )
            )
        elif payout_cents > stake:
            self.ledger.post(
                Posting(
                    debit=hold,
                    credit=cash,
                    amount_cents=stake,
                    idempotency_key=f"settle:{round_id}",
                    event="settle_return_stake",
                )
            )
            self.ledger.post(
                Posting(
                    debit=HOUSE,
                    credit=cash,
                    amount_cents=payout_cents - stake,
                    idempotency_key=f"settle_win:{round_id}",
                    event="settle_win",
                )
            )
        else:
            self.ledger.post(
                Posting(
                    debit=hold,
                    credit=cash,
                    amount_cents=payout_cents,
                    idempotency_key=f"settle:{round_id}",
                    event="settle_partial_return",
                )
            )
            self.ledger.post(
                Posting(
                    debit=hold,
                    credit=HOUSE,
                    amount_cents=stake - payout_cents,
                    idempotency_key=f"settle_house:{round_id}",
                    event="settle_partial_house",
                )
            )

        rnd.status = RoundStatus.SETTLED
        rnd.payout_cents = payout_cents
        return rnd

    def request_withdraw(self, player_id: str, amount_cents: int, withdraw_id: str) -> Withdrawal:
        if amount_cents <= 0:
            raise LedgerError("amount must be positive")
        existing = self._withdrawals.get(withdraw_id)
        if existing:
            return existing
        if self._status.get(player_id, "active") == "frozen":
            raise GateBlocked("FROZEN", f"withdraw blocked: {player_id} is frozen (no new entries)")
        if not self._kyc.get(player_id, False):
            raise GateBlocked("KYC_REQUIRED", "withdraw blocked: KYC not verified")
        if amount_cents < MIN_DEPOSIT_CENTS:
            raise GateBlocked("AMOUNT_MIN", f"withdraw below min ${MIN_DEPOSIT_CENTS // 100}")
        available = self.ledger.signed_balance(cash_acct(player_id))
        if amount_cents > available:
            raise InsufficientFunds(f"need {amount_cents} have {available}")
        self.ledger.post(
            Posting(
                debit=cash_acct(player_id),
                credit=withdraw_acct(player_id),
                amount_cents=amount_cents,
                idempotency_key=f"withdraw:{withdraw_id}",
                event="withdraw_hold",
            )
        )
        w = Withdrawal(
            withdraw_id=withdraw_id,
            player_id=player_id,
            amount_cents=amount_cents,
            status=WithdrawStatus.PENDING,
        )
        self._withdrawals[withdraw_id] = w
        return w

    def on_payout_webhook(
        self,
        withdraw_id: str,
        status: str,
        psp_transaction_id: str,
    ) -> Withdrawal:
        w = self._withdrawals.get(withdraw_id)
        if w is None:
            raise LedgerError(f"unknown withdraw_id {withdraw_id}")
        mapped = self._psp_txn_to_withdraw.get(psp_transaction_id)
        if mapped and mapped != withdraw_id:
            raise LedgerError("psp_transaction_id already bound to another withdraw")
        if w.status in (WithdrawStatus.SENT, WithdrawStatus.FAILED):
            return w
        hold = withdraw_acct(w.player_id)
        if status == "payout_sent":
            applied = self.ledger.post(
                Posting(
                    debit=hold,
                    credit="cash_at_psp",
                    amount_cents=w.amount_cents,
                    idempotency_key=f"payout:{withdraw_id}",
                    event="payout_sent",
                )
            )
            if applied:
                w.status = WithdrawStatus.SENT
                w.psp_transaction_id = psp_transaction_id
                self._psp_txn_to_withdraw[psp_transaction_id] = withdraw_id
            return w
        if status == "failed":
            self.ledger.post(
                Posting(
                    debit=hold,
                    credit=cash_acct(w.player_id),
                    amount_cents=w.amount_cents,
                    idempotency_key=f"payout_fail:{withdraw_id}",
                    event="payout_failed",
                )
            )
            w.status = WithdrawStatus.FAILED
            w.psp_transaction_id = psp_transaction_id
            return w
        raise LedgerError(f"unknown payout status {status}")

    def cashier(self, player_id: str, deposit_id: str | None = None) -> CashierView:
        st = None
        if deposit_id and deposit_id in self._deposits:
            st = self._deposits[deposit_id].status.value
        return CashierView(
            available_cents=self.ledger.signed_balance(cash_acct(player_id)),
            in_play_cents=self.ledger.signed_balance(in_play_acct(player_id)),
            deposit_status=st,
            withdraw_pending_cents=self.ledger.signed_balance(withdraw_acct(player_id)),
        )
