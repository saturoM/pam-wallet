# Лекція 4 · Settle

Раунд `rnd_1` уже в `bets_in_play` ($10). Гра каже PAM: `settle(rnd_1, payout=…)`.  
Гра **не** пише виграш собі в гаманець. PAM закриває in-play проводками.

Після settle в `bets_in_play` по цьому раунду має бути **$0**. Гроші не випаровуються: вони йдуть або гравцю, або house.

## Три кінці (ставка була $10)

**Програш** `payout=0`

```
debit   bets_in_play    $10
credit  house           $10
ключ    settle:rnd_1
```

Гравець: cash без змін ($40). House +$10.

**Void** `payout=stake` ($10) — ставка назад, ніхто не виграв

```
debit   bets_in_play    $10
credit  player_cash     $10
ключ    settle:rnd_1
```

Знову $50 доступно. House 0.

**Виграш** `payout=$25` — назад ставка **і** виграш $15

Дві проводки, бо це два факти: повернули hold, і казино доплатило.

```
debit   bets_in_play    $10
credit  player_cash     $10
ключ    settle:rnd_1

debit   house           $15
credit  player_cash     $15
ключ    settle_win:rnd_1
```

Доступно $65. House −$15 (казино винне / програло гравцю).

## Що не проводка

- гра сама робить `balance += 25`
- другий `settle` того ж `rnd_1` — **немає нових рядків**
- settle, коли раунду немає — помилка, не вигадуємо гроші

## Касир

Знову лише ledger: доступно = `player_cash`, in-play = 0 по цьому раунду, house окремо.

Далі: практика в `career/learn/exercises/04_settle.md`.
