# Практика 3 · Ставка · розбір

Лекція: `career/learn/03_bet.md`.

У `player_cash` було $50. `place_bet(rnd_1, $10)`.

## 1. Одна проводка

| debit | credit | amount | ключ ідемпотентності |
|---|---|---|---|
| `player_cash` | `bets_in_play` | $10 | `bet:rnd_1` |

Не `captured:rnd_1`. `captured` — бирка депозиту.

## 2. Ретрай того ж `rnd_1`

**0 нових проводок.** `player_cash` **$40**, `bets_in_play` **$10**.

Retry шле **гра** (той самий `rnd_1`), не касир. PAM шукає бирку `bet:rnd_1` у ledger. Є → мовчанка.

## 3. Касир

Два числа з **ledger**: **доступно $40** (`player_cash`) і **in-play $10** (`bets_in_play`). Не одне «баланс 50».

---

Лекція 3 закрита. Далі лекція 4 · settle (lose / void / win), коли скажеш.
