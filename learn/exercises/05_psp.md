# Практика · PSP routing

Лекція: `career/learn/05_psp.md`. Терміни: `career/learn/05_terms.md`. Спочатку свої відповіді, потім розбір внизу.

## 1

Касир показав Success після 3DS ok, webhook `captured` ще не було. Чи можна ставити з цих $50?

## 2

`dep_1` — 3DS fail. Продакт хоче «автоматично дотиснути capture», щоб не губити конверсію. Твоя відповідь?

## 3

Soft decline на PSP-A. Cascade на B. Скільки `deposit_id` у PAM і який статус у `dep_1`?

## 4

Код `do_not_honor`. Чи cascade на PSP-C?

## 5

Два webhook `captured` на `dep_1` з різними `evt_aaa` / `evt_bbb`. Скільки проводок FILL?

## 6

PSP прислав статус `xyz_unknown`. Мапити в captured?

---

# Розбір

**1.** Ні. Success / 3DS ≠ FILL. Ставити можна після `captured` і проводки в `player_cash`.

**2.** Ні. `dep_1` → failed. Нова спроба = новий id (можливо інший PSP), не воскресіння fail як capture.

**3.** Два id: `dep_1` failed, `dep_2` на B (pending→…). Cascade не переписує ключ.

**4.** Ні. Hard decline — стоп.

**5.** Одна. Ключ = `deposit_id`, не id доставки.

**6.** Ні. Не вигадувати FILL → failed (або pending+алерт) і розібрати карту статусів.
