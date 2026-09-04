# Терміни · модуль 09 — chargeback / dispute

Коротко. Розвилки: [`09_chargeback.md`](09_chargeback.md) · log: [`09_decision_log.md`](09_decision_log.md).

---

**Chargeback** = гравець (через банк) оскаржує списання з картки. Банк забирає $ у мерчанта / PSP. Це **не** звичайний Withdraw з кишені.

| | Withdraw | Chargeback |
|---|---|---|
| Хто ініціює | гравець у касі | банк / карткова схема |
| Шлях | PAM hold → PSP payout | спір по **вже captured** депозиту |
| Книга | `withdraw_in_flight` | dispute hold / reverse — **інший** ключ |

**Representment** = оператор/PSP оскаржує chargeback (докази).  
**Lost chargeback** = спір програно — гроші остаточно з мерчанта.

Не плутати з abuse hold (06) і freeze (04): там вивід; тут — спір по депозиту.
