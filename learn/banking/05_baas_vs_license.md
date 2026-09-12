# Лекція 05 · BaaS vs власна ліцензія

Одна ідея: ти збираєш **продукт на межі контракту**, не обов’язково банк у юрсенсі.

## Три моделі

| Модель | Швидкість | Що контролюєш | Типовий біль |
|---|---|---|---|
| **BaaS** | швидко | UX, ledger-шар, pricing, клієнт | ліміти партнера, roadmap чужий |
| **EMI / license light** | середньо | більше compliance ownership | капітал, аудит |
| **Full bank license** | повільно | майже все | регулятор, роки |

## Міст з Kyrrex

Kpay/Shotpay: ти володів **контрактною межею** (статуси, FX, iframe), не «усім банком». BaaS neobank — той самий рефлекс: чітко знати, **чий** IBAN, **чия** KYC-фінальність, **чий** dispute.

## Kill criteria для BaaS (приклад)

- Партнер не дає Instant там, де ти продаєш Instant
- Webhook не ідемпотентний / немає reconciliation file
- KYC reject не відділений від ledger write
- Exit clause / data portability відсутні

## Правило

> Перед фічею спитай: це **наш** ledger/UX чи **їхній** regulated rail? Якщо плутаєш — будеш дебажити чужий core під своїм SLA.

Далі: [`exercises/05_baas.md`](exercises/05_baas.md)
