# Decision log · 11 Platform teardown

Sequence-only. Walk: [`11_sequence.md`](11_sequence.md).

Мета: на інтерв’ю показати, що бачиш **money path** чужого продукту, не лобі/VIP.

---

## DL-11-1 · Той самий walk, не огляд бренду · 2026-09-04

| Варіант | Вердикт |
|---|---|
| Порівняти слоти, бонуси %, дизайн | **Reject** для цього модуля |
| Той самий cashier walk на **2 операторах** + **1 PAM vendor** public doc | **Adopt** |

**Інваріант.** Колонки = KYC when · deposit TAKE/FILL · RG · withdraw · cash vs bonus · **хто власник hops** (PAM / PSP / game / frontend).

---

## DL-11-2 · Ownership на кожному hops · 2026-09-04

| Варіант | Вердикт |
|---|---|
| «Сайт робить депозит» без розбивки | **Reject** |
| Кожен крок: хто TAKE, хто FILL, хто гейт | **Adopt** |

**Kill.** Teardown без імен власників (все «у казино»).
