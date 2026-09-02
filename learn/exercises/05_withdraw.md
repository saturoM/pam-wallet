# Практика 5 · Вивід · розбір

Лекція: `career/learn/05_withdraw.md`.

Було `player_cash` $50, вивід $20, `wd_1`.

## 1. Intent (клік, PSP ще мовчить)

| debit | credit | amount | ключ |
|---|---|---|---|
| `player_cash` | `withdraw_in_flight` | $20 | `withdraw:wd_1` |

Доступно **$30**. Hold **$20**.

## 2. Чому не як депозит

Депозит pending = **заявка** `dep_1`, **не** проводка в ledger (грошей ще немає). Gate tape — окремо: allow/deny, не баланс.

Вивід pending = **проводка hold**: гроші вже в казино, інакше їх поставлять.

## 3. `payout_sent`, потім повтор

Перший webhook:

| debit | credit | amount | ключ |
|---|---|---|---|
| `withdraw_in_flight` | `cash_at_psp` | $20 | `payout:wd_1` |

Повтор того ж ключа: **0** нових рядків. `player_cash` лишається **$30** (його вже зрізали на intent).

---

Грошовий ланцюжок закрито: депозит → ставка → settle → вивід. Лекції 1–5.
