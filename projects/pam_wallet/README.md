# PAM wallet · deposit + seamless bet/settle

Interview artifact for Senior Technical PM (iGaming / fintech).  
**Not** a casino UI. Cashier and game never write balance. Only PAM posts to a double-entry ledger.

## See it

Live: [desk](https://pam-wallet.onrender.com/) · [exam](https://pam-wallet.onrender.com/#/exam) · [recon](https://pam-wallet.onrender.com/#/exam-recon) · [drill](https://pam-wallet.onrender.com/#/drill)

React cashier + Nest PAM. In-memory book (reset clears it).

```bash
cd projects/pam_wallet
npm install --prefix api && npm install --prefix web
npm run start --prefix api
npm run dev --prefix web
```

Open **http://127.0.0.1:5173** — desk. Exam 1–5: **#/exam**. Recon: **#/exam-recon**. Spot-the-slip gym: **#/drill**.

Production (one process, after `npm run build` at this folder): **http://127.0.0.1:3001**, **#/exam**, **#/exam-recon**, **#/drill**. Nest serves `web/dist`.

Nest `GET /api/quiz` · `POST /api/quiz/check` · `POST /api/quiz/grade`. **30** questions (lectures 1–5).  
Recon: `GET /api/quiz/recon` · `POST /api/quiz/recon/check` · `POST /api/quiz/recon/grade`. **8** questions.  
Gym: `GET /api/drill` · `POST /api/drill/check` · `POST /api/drill/grade`. **8** cards. Answers stay on the server. Check returns a hint only when wrong.

Walk: Deposit $50 → captured → Submit KYC → Approve KYC → Withdraw $20 → Payout sent.

Same desk, same book. Lectures live in [`learn/`](../../learn/).

- **self-excluded** / **frozen** → no new deposit, no new bet. Open rounds still settle. Self-excluded **can withdraw**.
- Daily deposit **$100**. Pending occupies the room. Failed does not.
- Min **$10** / max **$200**. Try Deposit $5.
- **KYC off** on deposit. Submit KYC is pending (not verified). Compliance approve opens withdraw. Reject does not.

Python kernel (same rules, no UI): `python3 test_pam.py && python3 demo.py`

## Test (agent runs this, do not ask the user to click)

```bash
cd projects/pam_wallet
npm test
```

Runs: Nest kernel + HTTP walk on an ephemeral port (does not need :3001) · Python kernel · UI cashier walk (mocked fetch). After a desk change, run this before saying it works.


## Problem

1. Operators credit the player on cashier “Deposit success”. 3DS can still fail. PSP webhooks retry → phantom $ or $50 twice.
2. Slot/sportsbook keep a second wallet. Timeout + retry → stake taken twice, or win paid into a wallet PAM never saw.

## Decision

| Option | Verdict |
|---|---|
| `balance += amount` in cashier / game | Reject — TAKE is not FILL |
| Credit on 3DS success | Reject — 3DS ≠ money received |
| Transfer wallet (game holds a copy) | Reject for this slice — two books to recon |
| Credit on PSP `captured`, key = `deposit_id` | **Adopt** |
| Seamless: game calls PAM `place_bet` / `settle`, key = `round_id` | **Adopt** |
| Thin PAM entry gates before PSP and before a new bet | **Adopt** |
| KYC on deposit | Reject — withdraw gate |
| Cashier toggle “KYC verified” | Reject — submit is TAKE; compliance approve is FILL |

Refused: retry 3DS fails as capture; idempotency on webhook delivery id (`evt_…`); game `+=` on its own ledger.

## Sequence

```
player → cashier Deposit $50
       → PAM request_deposit(dep_1)     pending, available=$0
       → PSP (3DS at the issuing bank)
       → webhook captured
       → debit  cash_at_psp     $50
         credit player_cash:p_1 $50
         key    captured:dep_1

game   → PAM place_bet(rnd_1, $10)
       → debit  player_cash:p_1  $10
         credit bets_in_play:p_1 $10
         key    bet:rnd_1
       → available=$40  in_play=$10

game   → PAM settle(rnd_1, payout=$25)   # stake back + $15 win
       → debit  bets_in_play:p_1 $10
         credit player_cash:p_1  $10     key settle:rnd_1
       → debit  house            $15
         credit player_cash:p_1  $15     key settle_win:rnd_1
       → available=$65  in_play=$0  house=−$15

player → cashier Submit KYC (kyc_1)
       → PAM pending, still unverified, no posting
       → compliance Approve
       → PAM kycVerified
       → PAM request_withdraw(wd_1, $20)
         debit  player_cash:p_1           $20   key withdraw:wd_1
         credit withdraw_in_flight:p_1    $20
       → PSP payout_sent
         debit  withdraw_in_flight:p_1    $20   key payout:wd_1
         credit cash_at_psp               $20
```

Lose: `payout=0` → in_play → house. Void: `payout=stake` → in_play → player_cash.

Duplicate webhook / duplicate `round_id` → no second posting. Bet over available → no posting.

## Stack

| Layer | Role |
|---|---|
| `web/` React | Cashier read-model. Never posts. |
| `api/` Nest | Only writer. `/api/desk` snapshot. |
| `ledger.py` / `api/src/ledger.ts` | Double-entry + idempotency keys |

Invariant on screen: **cash at PSP = player cash + in-play + withdraw hold + house**.

## How to talk about it

“Same wallet: pending deposit is not a posting; pending withdraw is a hold because the cash is already ours. KYC submit is also TAKE — cashier does not verify. Compliance approve is FILL. Self-exclusion blocks new entries but still pays out.”

## What this is not yet

Bonus/wagering and PSP routing stay **this desk** when we add them.
