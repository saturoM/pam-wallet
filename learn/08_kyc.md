# Лекція · KYC / AML eligibility (модуль 08)

Не новий паспорт у UI. Спочатку **терміни**: [`08_terms.md`](08_terms.md). Розвилки — нижче.

На desk: KYC на **вивід**, не на депозит. Submit = pending. Approve = verified. Сьогодні фіксуємо матрицю гейтів і хто ставить прапорець.

## Карта

| Ідея | Правило |
|---|---|
| Три рівні | до KYC · KYC verified · EDD |
| Три дії | депозит · ставка · вивід — гейти **окремо** |
| Наш default | депозит+гра до KYC; вивід після verified |
| Статус | Webhook вендора ≠ PAM, поки PAM не записав |
| Reject | Не void відкритого раунду |
| Freeze | Не «KYC failed» і не self-ex |

## 1. KYC на депозит — reject для цього продукту

Уже в money-path: депозит без KYC. Інакше конверсія падає, а закон (на багатьох ринках) чіпає саме **вивід / поріг**. Юрисдикція з KYC-at-signup — окремий рядок у 10, не мовчазна зміна desk.

## 2. Submit ≠ verified

Submit створює заявку `pending`. 0 проводок. Вивід досі **403**. Лише approve (compliance / PAM після вендора) ставить `kycVerified`.

## 3. Webhook вендора — сирий сигнал

KYC-провайдер шле `approved`. Якщо каса одразу «Verified» без запису PAM — розсинхрон: вендор сказав так, книга / гейти ще ні (або навпаки). **FILL статусу** = PAM записав прапорець (ідемпотентно по `kyc_id`).

## 4. Reject не void-ить `rnd_1`

Документи відхилили. $10 уже в `bets_in_play`. Не settle lose і не void «бо KYC». Раунд живе. Вивід лишається закритим.

## 5. EDD — третій рівень

Після звичайного KYC risk просить джерело коштів / додаткові доки. Поки EDD не done: можна лишити вивід на hold / нижчий ліміт (продуктова політика). На модулі: EDD unlock = вищі ліміти / зняття review-hold — не новий депозитний гейт.

## 6. Freeze лишається з 04

AML freeze ріже вивід. KYC reject також ріже вивід — **але з іншої причини** (немає verified). Не зводити в один статус `blocked`.

## Не на цій лекції

Конкретні вендори (Sumsub тощо) · повний AML scoring · jurisdiction matrix (10) · chargeback (09). Desk walk: уже Submit → Approve → Withdraw; reject + відкритий раунд — перевірити, що раунд живий.

Closed: `#/exam-kyc` · `exercises/08_kyc.md` · [`08_decision_log.md`](08_decision_log.md) · [`08_sequence.md`](08_sequence.md). Desk walk skipped.
