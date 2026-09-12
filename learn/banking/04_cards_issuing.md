# Лекція 04 · Card issuing (PM-рівень)

Одна ідея: картка — це **hold-машина + схема + PCI межа**, не «кнопка Visa».

## Що ти збираєш

| Блок | Хто часто володіє |
|---|---|
| BIN / BIN sponsor | банк / емітент-партнер |
| Processor / issuer processing | Marqeta-like / BaaS |
| Card controls (MCC, limits) | **твій** продукт |
| 3DS / SCA | емітент + ти як UX/flow owner |
| PCI | не свої PAN-поля на домені (SAQ-A / hosted) |

## Auth hold

Покупка €40 → auth hold €40 (іноді +margin для fuel тощо) → available ↓. Clear може бути €38. Різниця hold має **звільнитись**.

## Chargeback

Як у PAM: це не «withdraw». Це спір після схеми. Hold/програма dispute — окремий стан.

## Правило

> Ти продаєш **контроль і UX**; рейки схеми й BIN майже завжди в партнера. Межа контракту = як white-label / iframe PSP.

Далі: [`exercises/04_cards.md`](exercises/04_cards.md)
