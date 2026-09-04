# Лекція · Bonus / wagering (модуль 06)

Не CRM і не «який % на welcome». Спочатку **терміни**: [`06_terms.md`](06_terms.md). Розвилки — нижче.

Syllabus: дві кишені (cash ≠ bonus) · відіграш · **один** abuse hold на payout.

## Карта

| Ідея | Правило |
|---|---|
| Ring-fence | Cash і bonus — **два** баланси, не один з лейблом |
| Грант | PAM проводить у **bonus** pocket; не `player_cash` |
| Wagering | Поки ціль не виконана — з bonus **немає** виводу |
| Stake | Гра бере з правил кишень (часто bonus спочатку або за спекою); каса не `+=` |
| Early withdraw cash | Часто **forfeit** залишку bonus — окрема розвилка |
| Abuse hold | Підозрілий payout → **hold**, не `payout_sent` |

## 1. Не один balance з лейблом

`balance = 150` + нотатка «50 бонус» = support і вивід ламаються. Два рахунки: `player_cash` і `bonus_*`. Вивід читає лише те, що **withdrawable**.

## 2. Грант ≠ депозит

Оператор дає $50 bonus. Це не PSP `captured`. Ключ на кшталт `bonus:grant_1`. У `cash_at_psp` нічого не змінюється від гранту самого по собі (гроші оператора / маркетинг, не картка гравця).

## 3. Wagering — лічильник, не тумблер

×10 від $50 = $500 turnover. Кожна кваліфікована ставка додає до прогресу. До цілі: вивід з bonus **403** / deny. Після цілі: unlock за правилами (bonus → cash або окремий withdrawable).

## 4. Вивід cash, поки bonus живий

Гравець має $40 cash + $50 bonus (ще не відіграно). Хоче вивести $40.

| Варіант (типово) | Сенс |
|---|---|
| Дозволити + **forfeit** bonus | Часто adopt: забрав кеш — акція згорає |
| Заблокувати будь-який вивід | Жорсткіше; інший продукт |
| Дозволити і лишити bonus | **Reject** для цього модуля — abuse-Friendly |

На цьому модулі: **withdraw cash → forfeit незакритого bonus** (проста жорстка правило).

## 5. Abuse hold на payout

Withdraw пройшов KYC і гейти кишень, але risk каже «схема / мультиакаунт / bonus dump».

Не `payout_sent`. Стан **hold** на `wd_*`: гроші лишаються в hold / review, PSP out не кликати. Ops: release → payout, або reject → назад у кишеню (за політикою), або forfeit linked bonus.

Це **один** іменований hold у sequence — не повний fraud engine.

## Не на цій лекції

Фріспіни як окремий product, contribution % по провайдерах ігор, max cashout з бонуса, CRM сегменти, desk UI mocks (після log/sequence).

Closed: `#/exam-bonus` · `exercises/06_bonus.md` · [`06_decision_log.md`](06_decision_log.md) · [`06_sequence.md`](06_sequence.md).
