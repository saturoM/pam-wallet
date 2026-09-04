# Decision log · 09 Chargeback

Лекція: [`09_chargeback.md`](09_chargeback.md). Walk: [`09_sequence.md`](09_sequence.md).

---

## DL-09-1 · Dispute ≠ withdraw · 2026-09-04

**Контекст.** По `dep_1` (captured $50) прийшов chargeback. Ops хоче «просто зробити Withdraw $50».

| Варіант | Вердикт |
|---|---|
| Звичайний `withdraw:wd_*` з кишені | **Reject** — інший ініціатор і контур |
| Ledger **dispute** по `dep_1`, ключ `chargeback:dep_1` (або `dispute:dep_1`) | **Adopt** |

**Інваріант.** Chargeback не проходить cashier Withdraw UX як щасливий шлях.

**Kill.** «Виведи йому те саме $50 кнопкою Withdraw».

---

## DL-09-2 · Не дебетувати двічі · 2026-09-04

**Контекст.** $50 уже в `player_cash` (або частково програно). Chargeback забирає $ у PSP.

| Варіант | Вердикт |
|---|---|
| Ще раз `balance -= 50` у касі + окремий hold | **Reject** — подвійний удар / хаос |
| Одна іменована проводка/hold на спір; якщо в кишені вже менше — shortfall / house / debt policy (окремо), але **не** два повні дебети того самого dep | **Adopt** |

**Інваріант.** Один спір на один `deposit_id` у книзі як одна логічна подія.

---

## DL-09-3 · Hold спочатку · 2026-09-04

**Контекст.** Спір відкрито, representment ще йде.

| Варіант | Вердикт |
|---|---|
| Одразу списати в house як lost | **Reject** — ще не програно |
| **Hold / reverse** у ledger; вивід гравця різати, доки спір відкритий | **Adopt** |

**Інваріант.** Відкритий dispute блокує payout з цих коштів (і часто весь вивід), поки не closed.

---

## DL-09-4 · Representment vs lost · 2026-09-04

**Контекст.** Два кінці спору.

| Варіант | Вердикт |
|---|---|
| Один статус `chargeback` назавжди | **Reject** — не видно outcome |
| Won representment → зняти hold / відновити; **lost** → остаточний збиток (окрема проводка), hold закрити | **Adopt** |

**Інваріант.** Два terminal outcomes. Не плутати з failed deposit (грошей не було) — тут FILL уже був.
