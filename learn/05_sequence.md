# Sequence · 05 PSP routing (для іншого PM)

Чому так — [`05_decision_log.md`](05_decision_log.md). Грошовий walk — [`sequence.md`](sequence.md). Терміни — [`05_terms.md`](05_terms.md).

Цифри: депозит **$50**. Ключі `dep_1`, `dep_2`. PSP-A потім PSP-B.

---

## 1. Happy path · FILL лише captured (DL-05-1)

| Крок | Хто | TAKE/FILL | Книга / gate |
|---|---|---|---|
| Deposit $50 click | касир → PAM | TAKE | `dep_1` **pending** · available **$0** · 0 проводок |
| 3DS passed | банк | — | все ще pending · **не** кредитити |
| Success у касі | UI | — | лише екран · баланс з ledger |
| Webhook `captured` | PSP-A | FILL | `captured:dep_1` · `player_cash` **$50** |
| place_bet $10 | гра | FILL | можна · після FILL |

До `captured` ставка з цих $50 — **ні**.

---

## 2. 3DS fail · без retry як capture (DL-05-2)

| Крок | Хто | TAKE/FILL | Книга / gate |
|---|---|---|---|
| Deposit click | касир → PAM | TAKE | `dep_1` pending |
| 3DS fail / closed | банк | — | `dep_1` → **failed** · 0 проводок · RG room вільна |
| «Дотиснути capture» на `dep_1` | продакт | — | **deny** |
| Нова спроба | касир | TAKE | **`dep_2`** (той самий або інший метод) · не воскресіння `dep_1` |

---

## 3. Soft decline → cascade (DL-05-3)

| Крок | Хто | TAKE/FILL | Книга / gate |
|---|---|---|---|
| `dep_1` → PSP-A | routing | TAKE | pending на A |
| Soft decline | PSP-A | fail | `dep_1` **failed** |
| Cascade | routing | TAKE | відкрити **`dep_2`** на PSP-B |
| `captured` на `dep_2` | PSP-B | FILL | `captured:dep_2` · кишеня $50 |
| Пізній webhook на `dep_1` | PSP-A | — | no-op / ignore як FILL · `dep_1` лишається failed |

Два id. Cascade не переписує ключ.

---

## 4. Hard decline · стоп (DL-05-4)

| Крок | Хто | TAKE/FILL | Книга / gate |
|---|---|---|---|
| `dep_1` → PSP-A | routing | TAKE | pending |
| `do_not_honor` | PSP-A | fail | `dep_1` failed · **hard** |
| Auto cascade PSP-C | routing | — | **deny** |
| Support | ops | — | наш статус + raw код · ручне рішення / інший метод лише новим id після політики |

---

## 5. Подвійний webhook (DL-05-5)

| Крок | Хто | TAKE/FILL | Книга / gate |
|---|---|---|---|
| `captured` evt_aaa | PSP | FILL | одна проводка `captured:dep_1` |
| `captured` evt_bbb | PSP | — | **no-op** · ключ = `deposit_id` |

---

## 6. Невідомий код (DL-05-6)

| Крок | Хто | TAKE/FILL | Книга / gate |
|---|---|---|---|
| Webhook `xyz_unknown` | PSP | — | **не** captured |
| PAM | PAM | fail / hold | `failed` **або** pending + **алерт** · 0 FILL |
| Ops | — | — | оновити карту статусів / спитати PSP |

---

## Що цей sequence свідомо не покриває

Bonus / wagering (06) · KYC глибше (08) · chargeback (09) · живий teardown (11) · вибір конкретного PSP за ціною/geo як прод-конфіг · UI hosted vs iframe (лише footnote DL-05-7) · mocks multi-PSP на desk (наступний крок після цього walk).
