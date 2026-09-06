# Quiz · refresh 01–10

По 3 питання на модуль. Відповіді: одна літера A / B / C.
Формат здачі в чаті: `01: A C B` (або всі 30 разом).
Ключ: [`refresh_01_10_answers.md`](refresh_01_10_answers.md) — не відкривай до здачі.

---

## 01 · Money path

**1.** Гравець натиснув Deposit $50. Касир показав Success. Що правда?
- A) У `player_cash` уже $50 — можна ставити
- B) Це TAKE: проводки ще немає, грошей у кишені немає
- C) Це FILL: 3DS завжди означає captured

**2.** Коли вперше можна ставити після депозиту?
- A) Після кліку Deposit
- B) Після Success у касі / 3DS ok
- C) Після PSP `captured` і проводки PAM

**3.** UI робить `balance += 50` на кліку Deposit. Що зламано?
- A) Нічого — так швидше для UX
- B) Кредитує до FILL → фантом / подвійний кредит на webhook
- C) Лише повільніше recon

---

## 02 · Posting / spec

**4.** PSP: `dep_1` = captured $50. Правильна проводка?
- A) Лише `credit player_cash $50`
- B) `debit cash_at_psp $50` / `credit player_cash $50`, ключ на `dep_1`
- C) `debit player_cash` / `credit house`

**5.** Другий webhook `captured` на той самий `dep_1`. Що робить PAM?
- A) Друга проводка +$50
- B) 0 нових рядків (ідемпотентність)
- C) Сторно першої і нова

**6.** Джерело правди API-контракту на цьому desk?
- A) OpenAPI YAML спочатку
- B) HTTP-статус 403/409 як смисл
- C) Business id у тілі + snapshot / `{error,code,gate?}`; ключ проводки від id

---

## 03 · Bet + recon

**7.** `place_bet(rnd_1, $10)` при cash $50. Книга?
- A) `player_cash` → `house`
- B) `player_cash` → `bets_in_play`, ключ `bet:rnd_1`
- C) Лише UI `balance -= 10`, без PAM

**8.** Desk «balanced». PSP виписка на $0.01 більше. Що робити?
- A) Ігнорувати — книга зведена
- B) `recon_adjust` $0.01
- C) Відкрити break; книгу не патчити, поки немає причини

**9.** Гра логує 2× POST на `rnd_1`, PAM має один `bet:rnd_1`. Це?
- A) Break: PAM занизив
- B) Очікуваний replay того ж ключа
- C) Треба друга проводка

---

## 04 · Settle + RG

**10.** Виграш payout $25 при stake $10. Як закрити in-play?
- A) Один рядок house→player $25
- B) Дві проводки: settle stake назад + settle_win $15 з house
- C) Гра сама `balance += 25`

**11.** Self-exclusion при відкритому `rnd_1` $10 in-play. Що?
- A) Settle lose → house
- B) Void: in-play → player_cash; вивід дозволений (з KYC)
- C) Як денний ліміт: раунд грає далі, нічого не void

**12.** Captured $100 за день, вивів $50, знову депозит $50. Денний ліміт $100.
- A) Ок: net звільнив room
- B) 403: ліміт gross (pending+captured), вивід не зменшує used
- C) Ок, бо failed депозити теж займають room

---

## 05 · Withdraw + PSP

**13.** Клік Withdraw $20 (гейти ok). Що одразу?
- A) Немає проводки, як на Deposit
- B) `player_cash` → `withdraw_in_flight`, ключ `withdraw:wd_1`
- C) Одразу `payout_sent` у PSP

**14.** 3DS passed, webhook `captured` ще немає. FILL?
- A) Так — банк підтвердив
- B) Так — Success у касі
- C) Ні — FILL лише на PSP `captured`

**15.** Soft decline на PSP-A, хочемо PSP-B.
- A) Той самий `dep_1`, інший PSP
- B) `dep_1` failed; новий `dep_2` на B
- C) Cascade і на hard decline (stolen card)

---

## 06 · Bonus

**16.** Welcome $50 bonus. Куди?
- A) Як `captured` у `player_cash`
- B) У bonus pocket, ключ `bonus:grant_*`; `cash_at_psp` від гранту не росте
- C) Касир `balance += 50` на Claim

**17.** Bonus $50 ×10. Одна ставка $50. Можна вивести bonus?
- A) Так — номінал уже поставлений
- B) Ні — потрібен оборот ~$500
- C) Так, якщо тумблер «bonus active»

**18.** $40 cash + $50 bonus (не відіграно). Withdraw $40 cash.
- A) Вивести і лишити bonus
- B) Вивести → forfeit незакритого bonus
- C) Одразу `payout_sent`, навіть якщо risk каже abuse

---

## 07 · Case studies / artifacts

**19.** Що закриває модуль як interview artifact?
- A) Тільки OpenAPI без walk
- B) Decision log (розвилка) + sequence (walk для іншого PM)
- C) Changelog фіч і скріни лобі

**20.** Sequence має пояснювати «чому так обрали»?
- A) Так — увесь rationale в sequence
- B) Ні — «чому» в log; sequence = кроки TAKE/FILL/книга
- C) Так — замість decision log

**21.** Інваріант — це?
- A) Wish «KYC за 2 хв»
- B) Завжди-правда про стан; порушення = зламана модель
- C) Метрика % дублів webhook

---

## 08 · KYC / AML

**22.** Default гейтів цього продукту?
- A) Усе заблоковано до KYC
- B) До KYC: депозит + ставка; вивід після verified
- C) KYC обовʼязково на кожен депозит

**23.** Submit KYC.
- A) Одразу verified + вивід
- B) Pending, 0 проводок, вивід ні
- C) Пише `player_cash`

**24.** KYC rejected, у in-play $10.
- A) Void як на self-ex
- B) Lose в house
- C) Раунд живе; вивід і так закритий

---

## 09 · Chargeback

**25.** Chargeback по `dep_1` $50.
- A) Звичайний Withdraw $50
- B) Окремий dispute/hold, ключ `chargeback:dep_1`
- C) Тихий `balance -= 50` у касі

**26.** Спір відкрито, representment ще йде.
- A) Одразу списати в house як lost
- B) Hold/reverse; різати вивід, доки спір відкритий
- C) Ігнорувати — captured уже був

**27.** Representment won vs lost.
- A) Один статус `chargeback` назавжди
- B) Won → зняти hold; lost → остаточний збиток, hold закрити
- C) Lost = той самий failed deposit (грошей не було)

---

## 10 · Jurisdiction

**28.** Кілька ринків (UK / MGA / US). Як?
- A) Окремий форк PAM на кожен ринок
- B) Jurisdiction pack як config-матриця гейтів
- C) Одна глобальна політика «як на desk» завжди

**29.** Мінімум колонок матриці?
- A) Колір бренду · VIP · game mix
- B) KYC when · RG mandatory · bonus ring-fence
- C) Лише tax rate

**30.** Конфлікт desk default vs рядок ринку.
- A) Desk завжди wins
- B) Config ринку wins; desk = один із рядків
- C) Ігнорувати матрицю на інтервʼю
