# Лекція · Chargeback (модуль 09)

Терміни: [`09_terms.md`](09_terms.md). Сьогодні — log + sequence (exam/desk optional).

## Lock

| Ідея | Правило |
|---|---|
| Не withdraw | Dispute ≠ `withdraw:wd_*` |
| Ключ | `chargeback:dep_*` / `dispute:dep_*` — окремий |
| Не двічі | Не дебетувати той самий депозит двічі в кишеню/hold |
| Hold | Спочатку hold / reverse у ledger; не тихий `balance -=` |
| Два outcomes | Representment won → зняти hold; lost → остаточний збиток (house / expense) |

Closed: terms · L2 in chat · [`09_decision_log.md`](09_decision_log.md) · [`09_sequence.md`](09_sequence.md). Exam/desk optional. Shortfall policy = later row.
