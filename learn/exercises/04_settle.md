# Практика 4 · Settle · розбір

Лекція: `career/learn/04_settle.md`.

Старт: `player_cash` $40, `bets_in_play` $10, `rnd_1`.

## 1. Програш `payout=0`

| debit | credit | amount | ключ |
|---|---|---|---|
| `bets_in_play` | `house` | $10 | `settle:rnd_1` |

`player_cash` **$40** (не чіпали). `bets_in_play` **$0**. `house` **$10**.

## 2. Виграш `payout=25`

Дві проводки. Друга сума **$15**, не $10 (25 = 10 ставка назад + 15 виграш). Рахунок гравця — `player_cash`.

| debit | credit | amount | ключ |
|---|---|---|---|
| `bets_in_play` | `player_cash` | $10 | `settle:rnd_1` |
| `house` | `player_cash` | $15 | `settle_win:rnd_1` |

`player_cash` **$65**. in-play **$0**.

## 3. Другий settle того ж `rnd_1`

**0** нових проводок.

---

Лекція 4 закрита. Далі — вивід (hold ≠ pending deposit), коли скажеш «лекція 5».
