# Sequence · 09 Chargeback

Чому так — [`09_decision_log.md`](09_decision_log.md).

Цифри: `dep_1` captured **$50** · гравець ще має $50 cash (або менше після ставок — нижче happy path).

---

## 1. Відкрити спір (DL-09-1…3)

| Крок | Хто | TAKE/FILL | Книга / gate |
|---|---|---|---|
| Deposit captured | PSP | FILL | `captured:dep_1` · cash $50 |
| Chargeback notice | банк / PSP | сигнал | ще не lost |
| Open dispute | PAM | hold/reverse | ключ `chargeback:dep_1` · **не** `withdraw:wd_*` |
| Withdraw attempt | касир | deny | спір відкритий |

Не друга кнопка Withdraw на ті самі $50.

---

## 2a. Representment won (DL-09-4)

| Крок | Хто | Книга |
|---|---|---|
| Won | PSP / bank | зняти dispute hold · кишеня/стан відновлені за політикою |
| Late second chargeback webhook | — | no-op / новий id лише якщо новий спір |

---

## 2b. Lost chargeback (DL-09-4)

| Крок | Хто | Книга |
|---|---|---|
| Lost | PSP | закрити hold · остаточний збиток (house / cb_loss) · **одна** логічна подія на `dep_1` |
| Каса `balance -=` ще раз | — | **deny** |

---

## Що свідомо не покриває

Повний evidence pack · fraud score · desk plant (вже є в recon) як продукт-спека · 08 EDD.
