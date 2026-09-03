# Sequence · 04 RG (для іншого PM)

Чому так — [`04_decision_log.md`](04_decision_log.md). Грошовий walk — [`sequence.md`](sequence.md).

Цифри: captured $50 (`dep_1`) · ставка $10 (`rnd_1`) · денний ліміт $100.

---

## 1. Ліміт депозиту · новий запит (DL-04-4)

| Крок | Хто | TAKE/FILL | Книга / gate |
|---|---|---|---|
| Deposit $50 captured | PSP | FILL | `captured:dep_1` · available $50 · used $50 |
| Deposit $60 | касир | TAKE deny | **403** `RG_DEPOSIT_LIMIT` · **0** рядків |
| place_bet $10 | гра | FILL | `bet:rnd_1` · in-play $10 · ліміт депозиту **не** 403 |

Відкритий раунд **живий**.

---

## 2. Self-exclusion · void (DL-04-1, DL-04-2)

Стан: available $40, in-play $10, `rnd_1` open. Може бути pending `dep_2`.

| Крок | Хто | TAKE/FILL | Книга / gate |
|---|---|---|---|
| Self-excluded | PAM | — | статус self-excluded |
| Void `rnd_1` | PAM | void | `bets_in_play` → `player_cash` $10 · ключ `settle:rnd_1` · in-play **$0** |
| `dep_2` якщо pending | PAM | fail | failed · room вільна · 0 проводок |
| place_bet `rnd_2` | гра | deny | **403** `SELF_EXCLUDED` · 0 рядків |
| Withdraw (після KYC) | касир | hold | `withdraw:wd_1` — **можна** |

Не lose.

---

## 3. Freeze (DL-04-3)

Той самий стан, статус **frozen**, не self-ex.

| Крок | Хто | TAKE/FILL | Книга / gate |
|---|---|---|---|
| Frozen | PAM | — | статус frozen |
| place_bet / deposit | — | deny | **403** `FROZEN` |
| Withdraw | касир | deny | **403** `FROZEN` — навіть з KYC |
| Відкритий `rnd_1` | гра | settle можна | не void «як RG» |

Не підміняти self-exclusion freeze.

---

## 4. Gross room (DL-04-5)

| Крок | Хто | TAKE/FILL | Книга / gate |
|---|---|---|---|
| Deposit $100 captured | PSP | FILL | used **$100** |
| Withdraw $50 (KYC) | касир | hold | кишеня −$50 · **used лишається $100** |
| Deposit $50 | касир | TAKE deny | **403** `RG_DEPOSIT_LIMIT` |

---

## 5. Не відкрутити тим самим днем (DL-04-6)

| Крок | Хто | Що |
|---|---|---|
| Ліміт $100 → $20 | гравець | **зараз** · наступний депозит > $20 → 403 |
| Ліміт $20 → $200 зараз | гравець | **deny** · пауза (наступний день / 24h) |
| Self-ex → Active в тій самій сесії | гравець | **deny** у продукті · desk-кнопка не контракт |

---

## Що цей sequence свідомо не покриває

GAMSTOP, session time, reality check, wager/loss limit, «чекати результат провайдера» замість void.
