# Sequence · PAM money path (для іншого PM)

Не код. Walk, який можна імплементувати з цього аркуша.  
Рішення «чому так» — [`decision_log.md`](decision_log.md). Живий desk: [pam-wallet.onrender.com](https://pam-wallet.onrender.com/).

**Хто пише книгу.** Лише PAM. Касир і гра читають знімок.

**Інваріант екрана.** `cash_at_psp = player_cash + in_play + withdraw_hold + house`.

Цифри walk: Deposit **$50** (`dep_1`) → ставка **$10** (`rnd_1`) → виграш payout **$25** → KYC (`kyc_1`) → Withdraw **$20** (`wd_1`) → payout sent.

---

## 1. Депозит

| Крок | Хто | TAKE / FILL | Книга |
|---|---|---|---|
| Клік Deposit $50 | гравець / касир | TAKE | Заявка `dep_1` pending. Проводки **немає**. Доступно **$0**. |
| 3DS | банк | — | Все ще не гроші. Ставити не можна. |
| Webhook `captured` | PSP | FILL | `debit cash_at_psp $50` / `credit player_cash $50` · ключ `captured:dep_1`. Доступно **$50**. |
| Другий webhook того ж `dep_1` | PSP | — | **0** нових рядків. Ключ на платіж, не на `evt_…`. |
| Captured не прийшов / failed | PSP | — | Кишеня лишається **$0**. Failed не вигадує проводку. |

Два різні кліки `dep_1` і `dep_2` = два платежі = $100 після двох captured.

---

## 2. Ставка і settle

Гра кличе PAM. Немає другого гаманця в слоті.

| Крок | Книга | Після |
|---|---|---|
| `place_bet(rnd_1, $10)` | `player_cash` → `bets_in_play` · ключ `bet:rnd_1` | доступно **$40**, in-play **$10** |
| Retry того ж `rnd_1` | **0** рядків | як було |
| Ставка $60 при кишені $50 | **0** рядків | insufficient — PAM не вигадує борг |
| Програш `payout=0` | `bets_in_play` → `house` $10 · `settle:rnd_1` | кишеня **$40** (вдруге не ріжемо) |
| Void `payout=10` | `bets_in_play` → `player_cash` $10 | знову **$50**, house 0 |
| Виграш `payout=25` | (1) in-play → кишеня $10 `settle:rnd_1` (2) house → кишеня $15 `settle_win:rnd_1` | доступно **$65**, in-play **$0** |

Один рядок house→player на $25 **не** беремо: $10 лишились би в in-play.

Другий settle того ж `rnd_1` — 0 рядків.

---

## 3. KYC (не депозитний gate)

| Крок | TAKE / FILL | Книга |
|---|---|---|
| Submit KYC | TAKE | Pending. Проводки немає. Вивід ще закритий. |
| Compliance approve | FILL | Можна просити вивід. |
| Reject | — | Вивід закритий. Resubmit можна. |

Касир не тумблерить «verified».

---

## 4. Вивід

Гейти (KYC, freeze, ліміт, мін/макс) — **до** книги. Немає $ у `player_cash` (in-play не виводиться) → немає рядка, **PSP не кличемо**.

| Крок | TAKE / FILL | Книга |
|---|---|---|
| Клік Withdraw $20, гейти ok | TAKE, і одразу проводка | `player_cash` → `withdraw_in_flight` · `withdraw:wd_1`. Доступно **$45**, hold **$20**. PSP ще мовчить. |
| `payout_sent` | FILL виходу з сейфа | hold → `cash_at_psp` · `payout:wd_1`. Кишеню вдруге не ріжемо. |
| PSP `failed` | — | hold → `player_cash`. Не в house. Знову можна ставити. |
| Другий `payout_sent` того ж `wd_1` | — | **0** рядків. |

Холд **до** виклику PSP. Не «грати, поки payout не успішний» і не hold лише на accept PSP (між гейтами і accept кишеня жива). Деталі: **DL-4**.

---

## Що цей sequence свідомо не покриває

Bonus / wagering, маршрутизація кількох PSP, recon на $0.01, soft vs hard flatten. Не вклеювати в цей walk.

Якщо імплементатор питає «чому не на 3DS / чому холд на кліку» — не роздувати sequence, віддати [`decision_log.md`](decision_log.md).
