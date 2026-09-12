# Лекція 01 · Available ≠ ledger

Одна ідея. Картки, SEPA, BaaS — наступні модулі.

## Міст з PAM

| PAM (вже знаєш) | Banking |
|---|---|
| Intent / pending | гроші ще не «твої» для витрати |
| `player_cash` після captured | **available** balance |
| In-play / withdraw hold | **hold** на ledger |
| Касир Success ≠ FILL | UI «€100 на рахунку» ≠ можна витратити €100 |

## Що відбувається

Клієнт відкриває neobank-рахунок. На екрані часто одне число: **€1 000**. Для продукту це щонайменше **два** сенси:

| Поняття | Сенс | Чи можна витратити |
|---|---|---|
| **Ledger balance** | що книга вже провела (зобов’язання банку клієнту) | не завжди |
| **Available balance** | ledger мінус **holds** (auth картки, pending outbound, freeze) | так |
| **Hold** | зарезервовано під подію, яка ще не фінальна | ні |

Приклад: ledger €1 000, картковий auth hold €120 → **available €880**. UI, який показує лише ledger, дає overspend і chargeback/NSF-хаос.

## Два рахунки на старт (спрощено)

| Рахунок | Сенс |
|---|---|
| `cash_at_partner` / nostro | актив у BaaS / кореспонденті (як `cash_at_psp`) |
| `customer_ledger` | зобов’язання клієнту |

Inbound SEPA credit €50 після підтвердження рейлу (аналог FILL):

```
debit   cash_at_partner     50
credit  customer_ledger     50
```

Available += 50 лише коли немає hold і статус рейлу = final для вашої продуктової таблиці (модуль 02).

## Правило

> Те, що клієнт може витратити = **available**, не «останнє число з виписки партнера» і не Success у UI.

## Не на цій лекції

SEPA Instant vs SCT, card auth/clear, KYB. Спочатку тільки баланси й holds.

Далі: [`exercises/01_balances.md`](exercises/01_balances.md)
