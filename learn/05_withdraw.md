# Лекція 5 · Вивід

Остання лекція **грошового ланцюжка**. Бонус / KYC — не в цьому паку.

## Чим не схоже на депозит

Депозит: клік → **немає проводки**, поки PSP не сказав captured. Грошей ще немає.

Вивід: клік → **одразу проводка**. Гроші вже в `player_cash`. Якщо не забрати їх у hold — гравець поставить їх, поки PSP шле payout.

```
debit   player_cash           $20
credit  withdraw_in_flight    $20
ключ    withdraw:wd_1
```

Касир: доступно −$20, **withdraw hold** +$20. До payout гроші ще в казино, але ставити їх не можна.

## Два кінці від PSP

**Payout sent** — гроші пішли з казино:

```
debit   withdraw_in_flight    $20
credit  cash_at_psp           $20
ключ    payout:wd_1
```

Hold $0. На PSP мінус $20 (вийшли гравцю).

**Failed** — конверт hold назад у кишеню:

```
debit   withdraw_in_flight    $20
credit  player_cash           $20
ключ    payout_fail:wd_1
```

Знову можна ставити. Другий webhook того ж `wd_1` — **немає другого рядка**.

## Що не проводка

- клік Withdraw без відповіді PAM
- KYC / freeze (це gate tape, не книга)
- вивід більший за `player_cash` (in-play не виводиться) — немає рядка

Далі: практика в `career/learn/exercises/05_withdraw.md`.
