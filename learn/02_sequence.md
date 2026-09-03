# Sequence · 02 spec craft (для іншого PM)

Не OpenAPI. HTTP-walk поверх money path ([`sequence.md`](sequence.md)). Чому так — [`02_decision_log.md`](02_decision_log.md).

База: `/api`. Успіх **200** = повний snapshot столу (read-model). Фейл **не 200** = `{ error, code, gate? }` · рядка книги немає.

HTTP лише грубо: `GateBlocked` → **403** · `InsufficientFunds` → **409** · інший `LedgerError` → **400**. Смисл клієнту = `code` і `gate`, не число статусу.

Ключі проводок PAM будує сам: `captured:dep_1` · `bet:rnd_1` · `withdraw:wd_1`. У запиті шлемо **business id**.

---

## 1. Депозит

| Крок | Виклик | Відповідь | Книга |
|---|---|---|---|
| TAKE | `POST /deposits` `{ playerId, amountCents: 5000, depositId: "dep_1" }` | 200 snapshot · депозит pending | **0** рядків |
| FILL | `POST /psp-webhook` `{ depositId: "dep_1", status: "captured", pspTransactionId }` | 200 · available **$50** | `captured:dep_1` |
| Retry FILL | той самий `dep_1` + captured | 200 · без змін $ | **0** нових рядків |
| Тонкий гейт | депозит нижче мін | **403** `code=GateBlocked` `gate=AMOUNT_MIN` | **0** рядків |

KYC на депозит не стоїть.

---

## 2. Ставка

Спочатку captured `dep_1` $50.

| Крок | Виклик | Відповідь | Книга |
|---|---|---|---|
| TAKE+FILL ставки | `POST /bets` `{ playerId, roundId: "rnd_1", stakeCents: 1000 }` | 200 · available **$40** | `bet:rnd_1` |
| Retry | той самий `rnd_1` + той самий stake | 200 · як було | **0** рядків |
| Немає $ | stake $60 при $50 | **409** `code=InsufficientFunds` | **0** рядків |
| Гейт | `frozen` / `self_excluded` | **403** `code=GateBlocked` `gate=FROZEN` або `SELF_EXCLUDED` | **0** рядків |
| FILL settle | `POST /settle` `{ roundId: "rnd_1", payoutCents: 2500 }` | 200 | `settle:rnd_1` + `settle_win:rnd_1` (як у money path) |

Інший stake на вже живий `rnd_1` → **400** `LedgerError` (конфлікт наміру), не друга ставка.

---

## 3. Вивід

KYC approve вже був (`POST /kyc` TAKE, `POST /kyc-review` FILL — без проводок).

| Крок | Виклик | Відповідь | Книга |
|---|---|---|---|
| TAKE+hold | `POST /withdrawals` `{ playerId, amountCents: 2000, withdrawId: "wd_1" }` | 200 · hold **$20** | `withdraw:wd_1` **до** PSP |
| Немає KYC | той самий POST | **403** `gate=KYC_REQUIRED` | **0** рядків, PSP не кличемо |
| FILL payout | `POST /payout-webhook` `{ withdrawId: "wd_1", status: "payout_sent", … }` | 200 | `payout:wd_1` |

---

## Що цей sequence свідомо не покриває

Повний OpenAPI YAML. Recon $0.01. Кілька PSP. Bonus. Чужий `Idempotency-Key`.

Read: `GET /desk`. Тести quiz — не частина цього контракту грошей.
