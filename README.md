# PAM wallet

Interview artifact for a Senior Technical PM (iGaming / fintech).

Cashiers and games never write balance. Only PAM posts a double-entry ledger. Deposit click is TAKE. PSP `captured` is FILL.

**Open without install:** [desk](https://pam-wallet.onrender.com/) · [exam](https://pam-wallet.onrender.com/#/exam) · [recon](https://pam-wallet.onrender.com/#/exam-recon) · [RG](https://pam-wallet.onrender.com/#/exam-rg) · [PSP](https://pam-wallet.onrender.com/#/exam-psp) · [Bonus](https://pam-wallet.onrender.com/#/exam-bonus) · [KYC](https://pam-wallet.onrender.com/#/exam-kyc) · [drill](https://pam-wallet.onrender.com/#/drill)

This repo is the money-path pack: lectures 1–5, recon, RG, PSP, bonus, KYC, a desk you can click, exams Nest grades, and a spot-the-slip gym. First Render hit after sleep can take ~30s. In-memory book resets on restart.

**Next (modules 09–11):** chargeback · jurisdiction · platform teardown. 08 KYC is **closed** (`#/exam-kyc` · log/sequence; desk walk skipped). Pitch last.

## What’s in here

| Path | What |
|---|---|
| [`learn/`](learn/) | Lectures 1–5 · recon · RG (`04_rg.md`) · [progress](learn/progress.md) · logs / sequences |
| [`projects/pam_wallet/`](projects/pam_wallet/) | React cashier + Nest PAM + Python kernel |

Not in this repo: live trading bots. Bonus desk mocks optional after module 06.

## Run the desk

```bash
cd projects/pam_wallet
npm install --prefix api && npm install --prefix web
npm run start --prefix api
npm run dev --prefix web
```

- Desk: [http://127.0.0.1:5173](http://127.0.0.1:5173)
- Exam (lectures 1–5): [http://127.0.0.1:5173/#/exam](http://127.0.0.1:5173/#/exam)
- Recon exam: [http://127.0.0.1:5173/#/exam-recon](http://127.0.0.1:5173/#/exam-recon)
- RG exam: [http://127.0.0.1:5173/#/exam-rg](http://127.0.0.1:5173/#/exam-rg)
- Gym (spot the slip): [http://127.0.0.1:5173/#/drill](http://127.0.0.1:5173/#/drill)

Walk on the desk: Deposit $50 → captured → Submit KYC → Approve KYC → Withdraw $20 → Payout sent.

Recon: after capture, **Run recon** (clean). **Plant PSP fee $0.01** → Run recon (break) → `recon_adjust` is rejected → **Post fee** → Run recon (clean). Retry the same `round_id` is not a PSP break.

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

6. [`03_recon.md`](learn/03_recon.md) — module 03 · recon (balanced ≠ PSP). Test: `#/exam-recon`.
7. [`04_rg.md`](learn/04_rg.md) — **module 04 closed** · RG. Terms: [`04_terms.md`](learn/04_terms.md). Test: `#/exam-rg`.
8. [`05_psp.md`](learn/05_psp.md) — **module 05 closed** · PSP routing. Terms: [`05_terms.md`](learn/05_terms.md). Test: `#/exam-psp`. Log: [`05_decision_log.md`](learn/05_decision_log.md) · [`05_sequence.md`](learn/05_sequence.md).
9. [`06_bonus.md`](learn/06_bonus.md) — **module 06 closed** · bonus / wagering. Terms: [`06_terms.md`](learn/06_terms.md). Test: `#/exam-bonus`. Log: [`06_decision_log.md`](learn/06_decision_log.md) · [`06_sequence.md`](learn/06_sequence.md).
10. [`08_kyc.md`](learn/08_kyc.md) — **module 08 closed** · KYC / AML. Terms: [`08_terms.md`](learn/08_terms.md). Test: `#/exam-kyc`. Log: [`08_decision_log.md`](learn/08_decision_log.md) · [`08_sequence.md`](learn/08_sequence.md).

## Decision (short)

| Option | Verdict |
|---|---|
| `balance +=` in cashier / game | Reject — TAKE is not FILL |
| Credit on 3DS success | Reject — 3DS ≠ money received |
| Credit on PSP `captured`, key = `deposit_id` | Adopt |
| Seamless `place_bet` / `settle`, key = `round_id` | Adopt |
| KYC on deposit | Reject — withdraw gate |

Invariant on screen: **cash at PSP = player cash + in-play + withdraw hold + house**.
