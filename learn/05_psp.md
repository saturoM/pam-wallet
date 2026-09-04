# Лекція · PSP routing (модуль 05)

Не вивід (`05_withdraw.md`) і не новий метод у UI. Спочатку **терміни**: [`05_terms.md`](05_terms.md). Розвилки — нижче.

На desk уже є: клік → pending → webhook `captured` / `failed`, ключ = `deposit_id`. Сьогодні закриваємо **кого** кликати і **що заборонено** робити з відмовою 3DS / банком.

## Карта

| Ідея | Правило |
|---|---|
| FILL | Лише PSP **`captured`** (не 3DS ok, не Success у касі) |
| 3DS fail | Спроба **мертва**. Не retry як capture |
| Cascade | Лише **новий** `deposit_id` на інший PSP після **soft** decline |
| Hard decline | Стоп. Не ганяти по всіх провайдерах |
| Ідемпотентність | Ключ книги = `deposit_id`, не `evt_…` доставки webhook |
| Невідомий код | Не вигадувати captured → `failed` + розбір |

## 1. 3DS passed ≠ FILL

Банк сказав «це гравець». Грошей у PAM ще немає. Кредитити `player_cash` на 3DS success = фантом, коли capture так і не прийде, або подвійний кредит, коли прийде пізніше.

## 2. Немає retry 3DS fail як capture

Гравець закрив вікно банку / не ввів код. Цей `dep_1` → **`failed`**. Не «натиснути ще раз той самий intent і намалювати captured». Не мапити fail → captured «щоб конверсія».

Якщо продукт хоче другу спробу — це **новий** депозит (`dep_2`), можливо інший PSP (cascade), не воскресіння `dep_1`.

## 3. Cascade = новий ключ

Soft decline на PSP-A: `dep_1` failed. Routing може відкрити `dep_2` на PSP-B. У книзі два різні id. Повторний webhook по `dep_1` ніколи не стає другою проводкою і не «переїжджає» на B.

## 4. Hard decline — без cascade

Stolen card / do not honor: один fail, кінець. Cascade тут = спам по PSP і ризик фроду, не «допомога гравцю».

## 5. Карта статусів — продукт

PSP шле свої коди. PAM має **таблицю**: код → `pending` | `captured` | `failed` | soft|hard. Support і гейти читають **наш** статус, не сирий рядок провайдера.

## 6. Hosted vs iframe (footnote)

Хто показує поля картки = хто тягне PCI. На цьому модулі не обираємо UI-оболонку як головну розвилку. У decision log — один рядок-footnote: desk лишається mock; live cashier scope = SAQ-A через hosted/iframe PSP, не свої input на домені.

## Не на цій лекції

Bonus / wagering (06), KYC глибше (08), chargeback (09), живий teardown казино (11). Мocks routing на desk — після walk / sequence.

Closed: `#/exam-psp` · `exercises/05_psp.md` · [`05_decision_log.md`](05_decision_log.md) · [`05_sequence.md`](05_sequence.md).
