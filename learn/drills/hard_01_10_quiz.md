# Hard quiz · TPM PAM 01–10

Глибше за refresh. Де є trade-off — у питанні заданий **критерій** (мета продукту). Де broken walk — знайди крок, що ламає інваріант.
Ключ: [`hard_01_10_answers.md`](hard_01_10_answers.md).

---

## Block A · Multi-step money path

**H1.** Walk: Deposit $50 click → Success UI → 3DS ok → webhook `captured:dep_1` → `place_bet(rnd_1,$10)` → settle win payout $25 → Submit KYC → Withdraw $20.
Який крок **ще не** дає право ставити?
- A) Success UI
- B) webhook `captured`
- C) Submit KYC

**H2.** Той самий walk. Після win payout $25 (stake був $10) у книзі має бути:
- A) Один рядок house→player $25
- B) `settle:rnd_1` (in-play→cash $10) + `settle_win:rnd_1` (house→cash $15); in-play по rnd_1 = 0
- C) Гра `balance += 25`, PAM мовчить

**H3.** Після captured $50 гравець ставить $10, потім Self-ex. PSP ще шле captured на **інший** pending `dep_2`.
- A) Кредитити `dep_2` у player_cash — хай виведе
- B) `dep_2` failed / 0 у кишені; refund у контурі PSP, не `withdraw:wd_*`; відкритий rnd void (не lose)
- C) Freeze замість self-ex і settle lose

---

## Block B · Broken sequences (знайди поломку)

**H4.** Хтось намалював sequence:
1. Deposit click → credit player_cash
2. captured → ще один credit того ж dep_1
3. place_bet → debit player_cash, credit порожній
Який **перший** крок уже ламає модель?
- A) Крок 1 (TAKE як FILL)
- B) Крок 2 (подвійний credit)
- C) Крок 3 (порожній credit)

**H5.** Recon: desk balanced, PSP файл +$0.01 на captured. Ops робить `recon_adjust` $0.01 house↔cash_at_psp без ключа платежу.
Що зламано?
- A) Нічого — $0.01 і balanced
- B) Break сховали другою «книгою без ключа»; внутрішня зведеність ≠ PSP recon
- C) Треба було друга проводка `captured` на той самий dep

**H6.** Withdraw $20: гейти ok → одразу виклик PSP payout → лише після accept PSP роблять hold з player_cash.
Діра?
- A) Немає — так швидше
- B) Між гейтами і accept кишеня ще жива: можна ставити / другий withdraw
- C) Hold має бути лише на failed

---

## Block C · Trade-offs (критерій у питанні)

**H7.** Мета: **trust + можливість забрати свій депозитний виграш до clear вейджера**, з forfeit акції. Яка модель?
- A) Sticky: один злитий баланс, вивід закритий до clear
- B) Non-sticky / cash-first + ring-fence + early cash withdraw → forfeit bonus
- C) Bonus-first без forfeit на cash-out

**H8.** Мета: **максимально прибити депозит до promo** (гравець не виходить з акції з кешем). Яка?
- A) Non-sticky parachute
- B) Sticky / wagering на deposit+bonus, вивід до clear закритий
- C) Cash-first з дозволом лишити bonus після cash withdraw

**H9.** Мета: **швидкий clear welcome на слотах** при живому cash. Що швидше крутить бонусний оборот?
- A) Cash-first (bonus спить, доки cash > 0)
- B) Bonus-first
- C) Contribution 0% на слотах

---

## Block D · Bonus / KYC / CB edge

**H10.** $40 cash + $50 bonus (вейджер відкритий). Risk чистий. Withdraw $40.
За default модуля 06:
- A) Вивести і лишити bonus
- B) Вивести → forfeit bonus
- C) Abuse hold обовʼязковий навіть без сигналу risk

**H11.** KYC rejected, rnd_1 ще in-play $10. Правильно?
- A) Void як self-ex
- B) Lose → house
- C) Раунд живе; вивід закритий бо не verified

**H12.** Chargeback на dep_1 після captured. Ops тисне «зроби Withdraw $50».
- A) Так — той самий контур
- B) Ні — окремий dispute/hold `chargeback:dep_*`, не `withdraw:wd_*`
- C) Тихий balance -= у касі

---

## Block E · PSP / jurisdiction / spec

**H13.** Soft decline PSP-A. Продукт хоче cascade на B.
- A) Той самий dep_1, змінити PSP
- B) dep_1 failed; новий dep_2 на B
- C) Мапити fail → captured для конверсії

**H14.** UK-style vs desk default «депозит без KYC». Конфлікт.
- A) Desk завжди wins на всіх ринках
- B) Рядок jurisdiction config wins; desk = один з рядків матриці
- C) Форкнути PAM-репо на UK

**H15.** Контракт: гра ретраїть place_bet з тим самим roundId. Успіх =?
- A) Другий рядок книги
- B) Той самий snapshot / 0 нових проводок (ідемпотентність по business id)
- C) 409 завжди, навіть якщо перший уже пройшов
