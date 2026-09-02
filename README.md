# PAM wallet

Interview artifact for a Senior Technical PM (iGaming / fintech).

Cashiers and games never write balance. Only PAM posts a double-entry ledger. Deposit click is TAKE. PSP `captured` is FILL.

**Open without install:** [desk](https://pam-wallet.onrender.com/) · [exam](https://pam-wallet.onrender.com/#/exam)

This repo is the money-path pack: five lectures, a desk you can click, and a 30-question exam the Nest API grades. First Render hit after sleep can take ~30s. In-memory book resets on restart.

## What’s in here

| Path | What |
|---|---|
| [`learn/`](learn/) | Lectures 1–5 · [decision log](learn/decision_log.md) · [sequence](learn/sequence.md) |
| [`projects/pam_wallet/`](projects/pam_wallet/) | React cashier + Nest PAM + Python kernel |

Not in this repo: live trading bots, bonus/wagering, PSP routing.

## Run the desk

```bash
cd projects/pam_wallet
npm install --prefix api && npm install --prefix web
npm run start --prefix api
npm run dev --prefix web
```

- Desk: [http://127.0.0.1:5173](http://127.0.0.1:5173)
- Exam (lectures 1–5): [http://127.0.0.1:5173/#/exam](http://127.0.0.1:5173/#/exam)

Walk on the desk: Deposit $50 → captured → Submit KYC → Approve KYC → Withdraw $20 → Payout sent.

One process in production: build the React app, then Nest serves desk + exam + `/api`.

```bash
cd projects/pam_wallet
npm install --prefix api && npm install --prefix web
npm run build
npm start
```

Desk: `http://127.0.0.1:3001` · exam: `http://127.0.0.1:3001/#/exam`.

Live: [https://pam-wallet.onrender.com](https://pam-wallet.onrender.com/). Redeploy from this repo’s `render.yaml`.

`npm test` in `projects/pam_wallet` runs Nest + Python + the cashier/exam UI tests. Nest `tsx` is not watch — restart the API after quiz changes.

## Lectures

1. [`01_money_path.md`](learn/01_money_path.md) — pending ≠ captured  
2. [`02_posting.md`](learn/02_posting.md) — captured is two sides, not `balance +=`  
3. [`03_bet.md`](learn/03_bet.md) — stake moves pocket → in-play, key `bet:rnd_1`  
4. [`04_settle.md`](learn/04_settle.md) — lose / void / win (win is two postings)  
5. [`05_withdraw.md`](learn/05_withdraw.md) — withdraw click **is** a hold posting  

Cheat sheet on the exam: **debit = from, credit = to**. Key = `event:id` (`captured:dep_1`, `bet:rnd_1`, `settle:rnd_1`, `withdraw:wd_1`).

## Decision (short)

| Option | Verdict |
|---|---|
| `balance +=` in cashier / game | Reject — TAKE is not FILL |
| Credit on 3DS success | Reject — 3DS ≠ money received |
| Credit on PSP `captured`, key = `deposit_id` | Adopt |
| Seamless `place_bet` / `settle`, key = `round_id` | Adopt |
| KYC on deposit | Reject — withdraw gate |

Invariant on screen: **cash at PSP = player cash + in-play + withdraw hold + house**.
