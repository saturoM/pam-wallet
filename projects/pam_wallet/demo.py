"""Run: python3 demo.py  — hiring-manager replay (~30s)."""
from __future__ import annotations

from pam import HOUSE, Pam


def usd(cents: int) -> str:
    return f"${cents / 100:.2f}"


def snap(pam: Pam, player_id: str, deposit_id: str | None = None) -> str:
    v = pam.cashier(player_id, deposit_id)
    return (
        f"available={usd(v.available_cents)} in_play={usd(v.in_play_cents)}"
        + (f" deposit={v.deposit_status}" if v.deposit_status else "")
    )


def main() -> None:
    pam = Pam()
    print("1) Deposit $50 — 3DS open, no webhook")
    pam.request_deposit("p_1", 5000, "dep_1")
    print(f"   {snap(pam, 'p_1', 'dep_1')} postings={len(pam.ledger.postings)}")

    print("2) PSP captured")
    pam.on_psp_webhook("dep_1", "captured", "psp_aaa")
    print(f"   {snap(pam, 'p_1', 'dep_1')}")

    print("3) Game place_bet $10 rnd_1 (seamless — game has no wallet)")
    pam.place_bet("p_1", "rnd_1", 1000)
    print(f"   {snap(pam, 'p_1')}")

    print("4) Game retries the same round_id")
    pam.place_bet("p_1", "rnd_1", 1000)
    print(f"   {snap(pam, 'p_1')} bet postings=1")

    print("5) Settle win — player receives $25 (stake $10 + $15)")
    pam.settle("rnd_1", payout_cents=2500)
    print(f"   {snap(pam, 'p_1')} house={usd(pam.ledger.signed_balance(HOUSE))}")
    print(f"   books_balance={pam.ledger.books_balance()} postings={len(pam.ledger.postings)}")

    print("6) Submit KYC — still unverified, no extra posting")
    pam.submit_kyc("p_1", "kyc_1")
    try:
        pam.request_withdraw("p_1", 2000, "wd_1")
    except Exception as e:
        print(f"   withdraw blocked: {e}")

    print("7) Compliance approve — then withdraw hold $20")
    pam.review_kyc("kyc_1", "approved")
    pam.request_withdraw("p_1", 2000, "wd_1")
    print(f"   {snap(pam, 'p_1')} withdraw_hold={usd(pam.cashier('p_1').withdraw_pending_cents)}")


if __name__ == "__main__":
    main()
