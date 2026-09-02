"""Invariants: deposit capture + seamless bet/settle. Game never writes the ledger."""
from __future__ import annotations

import unittest

from ledger import GateBlocked, InsufficientFunds
from pam import DepositStatus, HOUSE, Pam, cash_acct


class DepositSliceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.pam = Pam()

    def test_pending_cashier_is_zero(self) -> None:
        self.pam.request_deposit("p_1", 5000, "dep_1")
        view = self.pam.cashier("p_1", "dep_1")
        self.assertEqual(view.available_cents, 0)
        self.assertEqual(view.deposit_status, DepositStatus.PENDING.value)
        self.assertEqual(len(self.pam.ledger.postings), 0)

    def test_captured_credits_player_once(self) -> None:
        self.pam.request_deposit("p_1", 5000, "dep_1")
        self.pam.on_psp_webhook("dep_1", "captured", "psp_aaa")
        view = self.pam.cashier("p_1", "dep_1")
        self.assertEqual(view.available_cents, 5000)
        self.assertEqual(view.deposit_status, DepositStatus.CAPTURED.value)
        self.assertTrue(self.pam.ledger.books_balance())
        self.assertEqual(self.pam.ledger.signed_balance("cash_at_psp"), 5000)

    def test_duplicate_webhook_same_deposit_id(self) -> None:
        self.pam.request_deposit("p_1", 5000, "dep_1")
        self.pam.on_psp_webhook("dep_1", "captured", "psp_aaa")
        self.pam.on_psp_webhook("dep_1", "captured", "psp_aaa")
        self.assertEqual(self.pam.cashier("p_1").available_cents, 5000)
        self.assertEqual(len(self.pam.ledger.postings), 1)

    def test_two_real_deposits(self) -> None:
        self.pam.request_deposit("p_1", 5000, "dep_1")
        self.pam.request_deposit("p_1", 5000, "dep_2")
        self.pam.on_psp_webhook("dep_1", "captured", "psp_aaa")
        self.pam.on_psp_webhook("dep_2", "captured", "psp_bbb")
        self.assertEqual(self.pam.cashier("p_1").available_cents, 10000)
        self.assertEqual(len(self.pam.ledger.postings), 2)

    def test_failed_does_not_credit(self) -> None:
        self.pam.request_deposit("p_1", 5000, "dep_1")
        self.pam.on_psp_webhook("dep_1", "failed", "psp_aaa")
        self.assertEqual(self.pam.cashier("p_1", "dep_1").available_cents, 0)
        self.assertEqual(self.pam.cashier("p_1", "dep_1").deposit_status, "failed")
        self.assertEqual(len(self.pam.ledger.postings), 0)

    def test_repeat_request_same_deposit_id_is_same_intent(self) -> None:
        a = self.pam.request_deposit("p_1", 5000, "dep_1")
        b = self.pam.request_deposit("p_1", 5000, "dep_1")
        self.assertIs(a, b)

    def test_players_do_not_share_cash(self) -> None:
        self.pam.request_deposit("p_1", 5000, "dep_1")
        self.pam.request_deposit("p_2", 3000, "dep_2")
        self.pam.on_psp_webhook("dep_1", "captured", "psp_aaa")
        self.pam.on_psp_webhook("dep_2", "captured", "psp_bbb")
        self.assertEqual(self.pam.cashier("p_1").available_cents, 5000)
        self.assertEqual(self.pam.cashier("p_2").available_cents, 3000)


class BetSettleTests(unittest.TestCase):
    def setUp(self) -> None:
        self.pam = Pam()
        self.pam.request_deposit("p_1", 5000, "dep_1")
        self.pam.on_psp_webhook("dep_1", "captured", "psp_aaa")

    def test_bet_moves_cash_to_in_play(self) -> None:
        self.pam.place_bet("p_1", "rnd_1", 1000)
        v = self.pam.cashier("p_1")
        self.assertEqual(v.available_cents, 4000)
        self.assertEqual(v.in_play_cents, 1000)
        self.assertTrue(self.pam.ledger.books_balance())

    def test_settle_lose(self) -> None:
        self.pam.place_bet("p_1", "rnd_1", 1000)
        self.pam.settle("rnd_1", payout_cents=0)
        v = self.pam.cashier("p_1")
        self.assertEqual(v.available_cents, 4000)
        self.assertEqual(v.in_play_cents, 0)
        self.assertEqual(self.pam.ledger.signed_balance(HOUSE), 1000)

    def test_settle_win_returns_stake_plus_payout(self) -> None:
        self.pam.place_bet("p_1", "rnd_1", 1000)
        self.pam.settle("rnd_1", payout_cents=2500)
        v = self.pam.cashier("p_1")
        self.assertEqual(v.available_cents, 6500)
        self.assertEqual(v.in_play_cents, 0)
        self.assertEqual(self.pam.ledger.signed_balance(HOUSE), -1500)

    def test_settle_void_returns_stake(self) -> None:
        self.pam.place_bet("p_1", "rnd_1", 1000)
        self.pam.settle("rnd_1", payout_cents=1000)
        v = self.pam.cashier("p_1")
        self.assertEqual(v.available_cents, 5000)
        self.assertEqual(v.in_play_cents, 0)
        self.assertEqual(self.pam.ledger.signed_balance(HOUSE), 0)

    def test_duplicate_bet_same_round_id(self) -> None:
        a = self.pam.place_bet("p_1", "rnd_1", 1000)
        b = self.pam.place_bet("p_1", "rnd_1", 1000)
        self.assertIs(a, b)
        self.assertEqual(self.pam.cashier("p_1").available_cents, 4000)
        bets = [p for p in self.pam.ledger.postings if p.event == "bet"]
        self.assertEqual(len(bets), 1)

    def test_duplicate_settle(self) -> None:
        self.pam.place_bet("p_1", "rnd_1", 1000)
        self.pam.settle("rnd_1", 0)
        self.pam.settle("rnd_1", 0)
        self.assertEqual(self.pam.cashier("p_1").available_cents, 4000)
        self.assertEqual(self.pam.ledger.signed_balance(HOUSE), 1000)

    def test_insufficient_funds_no_posting(self) -> None:
        n = len(self.pam.ledger.postings)
        with self.assertRaises(InsufficientFunds):
            self.pam.place_bet("p_1", "rnd_1", 6000)
        self.assertEqual(len(self.pam.ledger.postings), n)
        self.assertEqual(self.pam.cashier("p_1").available_cents, 5000)

    def test_cannot_bet_on_pending_deposit(self) -> None:
        pam = Pam()
        pam.request_deposit("p_1", 5000, "dep_1")
        with self.assertRaises(InsufficientFunds):
            pam.place_bet("p_1", "rnd_1", 1000)

    def test_game_does_not_credit_its_own_wallet(self) -> None:
        self.pam.place_bet("p_1", "rnd_1", 1000)
        self.assertEqual(self.pam.ledger.signed_balance(cash_acct("p_1")), 4000)
        self.assertEqual(self.pam.ledger.signed_balance(cash_acct("game")), 0)


class EntryGateTests(unittest.TestCase):
    def test_self_exclusion_blocks_deposit(self) -> None:
        pam = Pam()
        pam.set_player_status("p_1", "self_excluded")
        with self.assertRaises(GateBlocked) as ctx:
            pam.request_deposit("p_1", 5000, "dep_1")
        self.assertEqual(ctx.exception.gate, "SELF_EXCLUDED")
        self.assertEqual(len(pam.ledger.postings), 0)

    def test_pending_occupies_daily_limit(self) -> None:
        pam = Pam()
        pam.request_deposit("p_1", 5000, "dep_1")
        pam.request_deposit("p_1", 5000, "dep_2")
        with self.assertRaises(GateBlocked) as ctx:
            pam.request_deposit("p_1", 5000, "dep_3")
        self.assertEqual(ctx.exception.gate, "RG_DEPOSIT_LIMIT")

    def test_freeze_blocks_new_bet_settle_ok(self) -> None:
        pam = Pam()
        pam.request_deposit("p_1", 5000, "dep_1")
        pam.on_psp_webhook("dep_1", "captured", "psp_aaa")
        pam.place_bet("p_1", "rnd_1", 1000)
        pam.set_player_status("p_1", "frozen")
        with self.assertRaises(GateBlocked):
            pam.place_bet("p_1", "rnd_2", 1000)
        pam.settle("rnd_1", 0)
        self.assertEqual(pam.cashier("p_1").in_play_cents, 0)


class WithdrawTests(unittest.TestCase):
    def _cash(self) -> Pam:
        pam = Pam()
        pam.request_deposit("p_1", 5000, "dep_1")
        pam.on_psp_webhook("dep_1", "captured", "psp_aaa")
        return pam

    def test_kyc_required(self) -> None:
        pam = self._cash()
        with self.assertRaises(GateBlocked) as ctx:
            pam.request_withdraw("p_1", 2000, "wd_1")
        self.assertEqual(ctx.exception.gate, "KYC_REQUIRED")
        self.assertEqual(pam.cashier("p_1").withdraw_pending_cents, 0)

    def test_submit_is_not_verified(self) -> None:
        pam = self._cash()
        pam.submit_kyc("p_1", "kyc_1")
        with self.assertRaises(GateBlocked) as ctx:
            pam.request_withdraw("p_1", 2000, "wd_1")
        self.assertEqual(ctx.exception.gate, "KYC_REQUIRED")
        self.assertEqual(len(pam.ledger.postings), 1)

    def test_hold_then_payout(self) -> None:
        pam = self._cash()
        pam.submit_kyc("p_1", "kyc_1")
        pam.review_kyc("kyc_1", "approved")
        pam.request_withdraw("p_1", 2000, "wd_1")
        self.assertEqual(pam.cashier("p_1").available_cents, 3000)
        pam.on_payout_webhook("wd_1", "payout_sent", "psp_out")
        pam.on_payout_webhook("wd_1", "payout_sent", "psp_out")
        self.assertEqual(pam.cashier("p_1").withdraw_pending_cents, 0)
        self.assertEqual(pam.ledger.signed_balance("cash_at_psp"), 3000)

    def test_self_excluded_can_cash_out(self) -> None:
        pam = self._cash()
        pam.submit_kyc("p_1", "kyc_1")
        pam.review_kyc("kyc_1", "approved")
        pam.set_player_status("p_1", "self_excluded")
        pam.request_withdraw("p_1", 2000, "wd_1")
        self.assertEqual(pam.cashier("p_1").withdraw_pending_cents, 2000)


if __name__ == "__main__":
    unittest.main()
