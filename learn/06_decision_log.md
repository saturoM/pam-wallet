# Decision log · 06 Bonus / wagering

Лекція: [`06_bonus.md`](06_bonus.md). Терміни: [`06_terms.md`](06_terms.md). Walk: [`06_sequence.md`](06_sequence.md).

---

## DL-06-1 · Ring-fence · дві кишені · 2026-09-04

**Контекст.** UI показує Balance $150. $50 з них — бонус. Інженер пропонує одне поле `balance` + нотатка.

| Варіант | Вердикт |
|---|---|
| Одне поле + лейбл / нотатка | **Reject** — невідомо, що withdrawable |
| Два баланси: `player_cash` і `bonus_*`; вивід читає лише withdrawable | **Adopt** |
| Усе в `player_cash`, бонус лише UI-бейдж | **Reject** — каса бреше |

**Інваріант.** Cash і bonus не змішують в одне число. Support і payout бачать кишені окремо.

**Kill.** `balance = cash + bonus` як джерело правди для виводу.

---

## DL-06-2 · Грант ≠ депозит · 2026-09-04

**Контекст.** Welcome $50. Продакт: «той самий FILL, що captured».

| Варіант | Вердикт |
|---|---|
| Грант = PSP `captured` у `player_cash` | **Reject** — картку не списували |
| Грант у **bonus** pocket, ключ `bonus:grant_*`; `cash_at_psp` від гранту не росте | **Adopt** |
| Касир `balance += 50` на Claim | **Reject** — касир не пише книгу |

**Інваріант.** Грант — проводка PAM у bonus. Не webhook депозиту.

---

## DL-06-3 · Wagering = оборот · 2026-09-04

**Контекст.** Бонус $50, ×10. Гравець поставив $50 один раз і хоче вивести бонус.

| Варіант | Вердикт |
|---|---|
| Одна ставка = номінал бонуса → unlock | **Reject** |
| Лічильник обороту до цілі (тут ~$500); до цілі вивід з bonus deny | **Adopt** |
| Тумблер «bonus active» без лічильника | **Reject** |

**Інваріант.** Wagering — накопичений turnover кваліфікованих ставок, не одна галочка.

**Переглярити, якщо** contribution % по іграх (спорт 10%) — окремий рядок; на цьому модулі 100% для простоти.

---

## DL-06-4 · Early cash withdraw → forfeit bonus · 2026-09-04

**Контекст.** $40 cash + $50 bonus (не відіграно). Withdraw $40.

| Варіант | Вердикт |
|---|---|
| Вивести cash і лишити bonus | **Reject** — abuse-friendly |
| Заблокувати будь-який вивід, доки bonus живий | Reject для default цього модуля (інший продукт) |
| Вивід cash дозволений → **forfeit** незакритого bonus | **Adopt** |

**Інваріант.** Забрав кеш при відкритому bonus — акція згорає (0 у bonus pocket після forfeit).

---

## DL-06-5 · Abuse hold на payout · 2026-09-04

**Контекст.** KYC ок, кишені ок, risk: bonus abuse / мультиакаунт.

| Варіант | Вердикт |
|---|---|
| Одразу `payout_sent` у PSP | **Reject** |
| Self-exclusion / AML freeze на весь акаунт | **Reject** як заміна hold (інші інструменти) |
| Статус **abuse hold** на `wd_*`: PSP out не кликати, поки ops release / reject | **Adopt** |

**Інваріант.** Hold ≠ sent. Гроші в hold/review, не на картці. Не той самий прапорець, що freeze / self-ex.

**Kill.** Тихий payout «бо KYC зелений».
