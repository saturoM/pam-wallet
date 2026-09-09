# Session notes · 2026-09-09 · open quiz (harder)

Format: open answers (not A/B/C). Modules already closed; drill = interview depth.

## Block 1 · modules 01–05 — score ~3.5 / 5

| Q | Topic | Result | Takeaway |
|---|--------|--------|----------|
| Q1 | TAKE≠FILL | OK | Bet before `captured` → reject; `player_cash=0`; no stake posting |
| Q2 | Posting | Weak | Cashier must not `balance += X`. PAM double-entry after FILL |
| Q3 | Recon | Weak | Break = PAM vs PSP statement; not a patch posting |
| Q4 | RG / self-ex | OK | `captured` after self-ex → do **not** credit wallet; refund/hold |
| Q5 | PSP cascade | OK | Soft → new `deposit_id`; never revive failed id as capture; no capture-retry on 3DS fail |

### Keys clarified

- **`deposit_id`**: PAM attempt key (idempotent webhooks; cascade = new id).
- **`psp_txn_id`**: PSP-world key for recon against PSP file.
- External path “bank → PSP → player” ≠ PAM ledger posting.

### Correct FILL posting (module 02)

After `captured €X` (from zero):

```
debit   cash_at_psp    X
credit  player_cash    X
key     deposit_id=…
```

Both sides move together. **Wrong intuition fixed:** `cash_at_psp` does **not** go to 0 when player is credited — asset and liability appear together.

Invariant (module 03):  
`cash_at_psp = player_cash + in-play + withdraw_hold + house`

`cash_at_psp` falls on **payout sent** / clawback — not on FILL, not on place bet (bet only moves `player_cash` → in-play).

## Re-drill · posting + recon (R1–R4 → X1–X2)

| # | Result | Note |
|---|--------|------|
| R1 | Partial | One posting on duplicate webhook ✓; balances were wrong until corrected to both +40 |
| R2 | OK | Cashier does not mutate ledger |
| R3 | OK | Idempotent bet replay ≠ recon break vs PSP |
| R4 | Corrected | “In bet / house” are **internal** — not causes of PSP>€ PAM. Prefer: missing webhook; fee/FX/cutoff mismatch. Broken idempotency more often → PAM > PSP |
| X1 | OK after fix | `cash_at_psp=25`, `player_cash=25` |
| X2 | OK | In-play does not create PSP recon break |

## Sticky reminder (from 2026-09-07, still relevant)

- Sticky ≠ “balances glued into one pot”. Sticky = lock / bonus-only stake contract.
- Debit policy label: **`bonus-only`** (not cash-first / bonus-first fallback).
- Wins → cash; cash withdraw often locked until wagering done, or **allow + forfeit** remaining bonus entitlement (state, not only zeroing a zero balance).

## Next

- Block 2 open quiz: 06 bonus → 09 chargeback (not started this session).
- Optional mini-case: deposit → bet → withdraw across accounts.

