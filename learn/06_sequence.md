# Sequence · 06 Bonus / wagering (для іншого PM)

Чому так — [`06_decision_log.md`](06_decision_log.md). Терміни — [`06_terms.md`](06_terms.md).

Цифри: cash deposit **$50** (`dep_1`) · welcome bonus **$50** (`grant_1`) · wagering **×10** · ставка **$10**.

---

## 1. Ring-fence + грант (DL-06-1, DL-06-2)

| Крок | Хто | TAKE/FILL | Книга / gate |
|---|---|---|---|
| Deposit $50 captured | PSP | FILL | `player_cash` **$50** · `captured:dep_1` |
| Claim welcome $50 | PAM | grant | `bonus_*` **$50** · ключ `bonus:grant_1` · **не** `player_cash` · **не** `cash_at_psp`+ |
| UI Balance | касир | read | показує cash і bonus **окремо** (або два поля) |

Не одне поле $100 з нотаткою.

---

## 2. Wagering (DL-06-3)

Стан: cash $50, bonus $50, need **$500** turnover.

| Крок | Хто | TAKE/FILL | Книга / gate |
|---|---|---|---|
| place_bet $10 (з bonus / за правилом кишень) | гра → PAM | FILL | прогрес wagering **+$10** (приклад) · ще не ціль |
| Withdraw з bonus | касир | deny | **403** / deny · ціль не виконана |
| … ставок до $500 qualified | — | — | unlock за правилами (bonus → withdrawable / cash) |

Одна ставка $50 ≠ виконаний ×10.

---

## 3. Early cash withdraw → forfeit (DL-06-4)

Стан: cash $40, bonus $50, wagering не закритий.

| Крок | Хто | TAKE/FILL | Книга / gate |
|---|---|---|---|
| Withdraw $40 | касир → PAM | hold | `withdraw:wd_1` з cash |
| Forfeit bonus | PAM | — | bonus → **$0** · грант згорів |
| Payout (якщо без abuse) | PSP | FILL | `payout:wd_1` |

Не лишати $50 bonus після виводу cash.

---

## 4. Abuse hold (DL-06-5)

Стан: withdraw створений, KYC ok, risk flag abuse.

| Крок | Хто | TAKE/FILL | Книга / gate |
|---|---|---|---|
| Withdraw request | касир | hold | `wd_2` у hold (не sent) |
| Risk: abuse | ops | — | статус **abuse_hold** |
| PSP payout | — | — | **не кликати** |
| Ops release | ops → PAM | — | далі звичайний payout webhook |
| Ops reject | ops → PAM | — | назад у кишеню (політика) · bonus forfeit якщо треба |

Не self-ex і не freeze замість цього hold.

---

## Що цей sequence свідомо не покриває

Contribution % по іграх · max cashout · фріспіни · повний fraud engine · desk UI mocks (після close, за бажанням) · KYC глибше (08) · chargeback (09).
