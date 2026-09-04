# Sequence · 08 KYC / AML (для іншого PM)

Чому так — [`08_decision_log.md`](08_decision_log.md). Терміни — [`08_terms.md`](08_terms.md).

Цифри: deposit **$50** (`dep_1`) · bet **$10** (`rnd_1`) · KYC `kyc_1`.

---

## 1. До KYC · депозит і гра, не вивід (DL-08-1)

| Крок | Хто | TAKE/FILL | Книга / gate |
|---|---|---|---|
| Deposit $50 → captured | PSP | FILL | `player_cash` $50 · **без** KYC |
| place_bet $10 | гра | FILL | `bet:rnd_1` · in-play $10 |
| Withdraw $20 | касир | deny | **403** · немає verified |

---

## 2. Submit → pending (DL-08-2)

| Крок | Хто | TAKE/FILL | Книга / gate |
|---|---|---|---|
| Submit KYC `kyc_1` | касир → PAM | TAKE статусу | `pending` · **0** проводок · вивід досі ні |

---

## 3. Вендор → PAM approve (DL-08-3)

| Крок | Хто | TAKE/FILL | Книга / gate |
|---|---|---|---|
| Webhook вендора `approved` | KYC provider | сигнал | ще **не** verified у PAM |
| Approve `kyc_1` | compliance → PAM | FILL статусу | `kycVerified` · ідемпотентно по `kyc_1` |
| Withdraw $20 (KYC ok, не freeze) | касир | hold | `withdraw:wd_1` |

Каса не читає вендора як джерело правди для гейту.

---

## 4. Reject + відкритий раунд (DL-08-4)

Стан: in-play $10, Submit → **rejected** (не approve).

| Крок | Хто | TAKE/FILL | Книга / gate |
|---|---|---|---|
| Reject KYC | PAM | — | немає verified |
| Void / lose `rnd_1` «бо KYC» | — | — | **deny** · раунд **живе** |
| Settle later | гра / PAM | FILL | звичайний lose/win/void за грою |
| Withdraw | касир | deny | досі немає verified |

---

## 5. EDD (DL-08-5) · коротко

| Крок | Хто | Що |
|---|---|---|
| KYC already verified | — | звичайний вивід / ліміт |
| Risk: EDD required | ops | review-hold або нижчий ліміт виводу (політика) |
| EDD done | PAM | зняти hold / підняти ліміт · не «новий Submit як reject» |

---

## 6. Не freeze замість KYC (DL-08-6)

| Статус | Вивід | Нова ставка (наш default) |
|---|---|---|
| Немає verified | ні | так (з кишені) |
| Freeze | ні | ні |
| Self-ex | так (після KYC) | ні |

---

## Desk walk (вже на desk)

1. Deposit → captured → place_bet (відкритий раунд опційно)  
2. Submit KYC → ще не Withdraw  
3. Approve KYC → Withdraw → payout  
4. Окремо: Reject при відкритому `rnd_1` — раунд не зникає  

---

## Що цей sequence свідомо не покриває

Конкретний вендор · повний AML score · jurisdiction KYC-at-signup (10) · chargeback (09).
