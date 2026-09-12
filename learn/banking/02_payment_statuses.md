# Лекція 02 · Auth / clear / settle / return

Одна ідея: у банку **кілька фінальностей**, не одна «Success».

## Міст з PAM

| PAM | Banking (картка) | Banking (SEPA) |
|---|---|---|
| TAKE / intent | **authorization** | payment initiated / accepted for processing |
| FILL / captured | часто ближче до **capture/clear** (мерчант забрав) | **settled** на рахунок |
| Settlement пачкою | **settle** зі схемою | settlement / accounting day |
| Chargeback / fail після | **reversal / return / chargeback** | **return** (R-code) |

## Картковий шлях (спрощено)

1. **Auth** — схема каже «ок, тримай hold». Available ↓. Ledger ще може не рухатись так, як ти очікуєш (залежить від core).
2. **Clear / capture** — мерчант підтверджує фінальну суму (може бути менше auth).
3. **Settle** — гроші між банками/схемою. Recon тут, не в моменті зеленої галочки в додатку.
4. **Return / chargeback** — гроші можуть піти назад **після** того, як клієнт уже «побачив» успіх.

## Правило

> Не мапити кожен зелений UI-стан на «гроші фінально наші». Веди **таблицю статусів партнера → наш статус** (як PSP code map у модулі 05 PAM).

## Не на цій лекції

Вибір Instant vs SCT, BIN/PCI. Далі: [`exercises/02_statuses.md`](exercises/02_statuses.md) · потім SEPA.
