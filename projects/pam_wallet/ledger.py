"""Double-entry ledger. Balance is never stored; it is the sum of postings."""
from __future__ import annotations

from dataclasses import dataclass

# Liability / equity: credit increases the signed balance.
# Assets (cash_at_psp): debit increases it.
_LIABILITY_BASES = frozenset({"player_cash", "bets_in_play", "withdraw_in_flight", "house"})


class LedgerError(ValueError):
    pass


class InsufficientFunds(LedgerError):
    pass


class GateBlocked(LedgerError):
    def __init__(self, gate: str, message: str) -> None:
        super().__init__(message)
        self.gate = gate


@dataclass(frozen=True)
class Posting:
    debit: str
    credit: str
    amount_cents: int
    idempotency_key: str
    event: str


def _base(account: str) -> str:
    return account.split(":", 1)[0]


class Ledger:
    def __init__(self) -> None:
        self._postings: list[Posting] = []
        self._keys: set[str] = set()

    def post(self, posting: Posting) -> bool:
        """Return False if this key was already applied (idempotent no-op)."""
        if posting.amount_cents <= 0:
            raise LedgerError("amount must be positive")
        if posting.debit == posting.credit:
            raise LedgerError("debit and credit must differ")
        if posting.idempotency_key in self._keys:
            return False
        self._keys.add(posting.idempotency_key)
        self._postings.append(posting)
        return True

    def signed_balance(self, account: str) -> int:
        debit = sum(p.amount_cents for p in self._postings if p.debit == account)
        credit = sum(p.amount_cents for p in self._postings if p.credit == account)
        if _base(account) in _LIABILITY_BASES:
            return credit - debit
        return debit - credit

    def books_balance(self) -> bool:
        """Assets (cash_at_psp) == liabilities + house."""
        accounts: set[str] = set()
        for p in self._postings:
            accounts.add(p.debit)
            accounts.add(p.credit)
        assets = 0
        claims = 0
        for a in accounts:
            bal = self.signed_balance(a)
            if _base(a) in _LIABILITY_BASES:
                claims += bal
            else:
                assets += bal
        return assets == claims

    @property
    def postings(self) -> tuple[Posting, ...]:
        return tuple(self._postings)
