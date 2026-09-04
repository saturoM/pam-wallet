# Sequence · 10 Jurisdiction matrix

Чому так — [`10_decision_log.md`](10_decision_log.md).

Не кліки на desk. Walk = **заповнити матрицю** (приклад-старт для інтерв’ю; уточнювати по ліцензії).

---

## Матриця (приклад defaults)

| | **UK-style** | **MGA-style** | **US-state style** |
|---|---|---|---|
| KYC when | рано / поріг; часто до виводу й активності | залежить від setup; часто withdraw + thresholds | state-driven; часто до play/withdraw |
| Deposit без KYC | обмежено / поріг | частіше можливо на low risk | часто ні |
| RG | жорсткий набір (ліміти, self-ex, tools) | обов’язковий набір під ліцензію | state RG + often deposit limits |
| Bonus ring-fence | очікувано розділені баланси | очікувано | очікувано + promo rules |
| Self-ex вивід | платити | платити | платити (типово) |

---

## Як інший PM використовує

1. Взяти рядок ринку з конфігу.  
2. Накласти на sequences 04 / 06 / 08 (гейти депозит/гра/вивід).  
3. Якщо конфлікт з desk default — **config wins** для того ринку, desk = один з рядків.

---

## Що свідомо не покриває

Повний legal memo · кожна штат US · tax reporting · 11 teardown живих брендів.
