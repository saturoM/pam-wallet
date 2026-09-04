# Decision log · 10 Jurisdiction matrix

Sequence-only модуль. Walk: [`10_sequence.md`](10_sequence.md). Не desk.

Контекст: один PAM, кілька ринків. Регуляція → **defaults / config**, не новий бот на кожну країну.

---

## DL-10-1 · Config, не форк коду · 2026-09-04

| Варіант | Вердикт |
|---|---|
| Окремий PAM-форк на UK / MGA / US | **Reject** для platform PM default |
| Jurisdiction pack: матриця гейтів (KYC when, RG tools, bonus ring-fence) як **конфіг** | **Adopt** |

**Інваріант.** Рядок ринку змінює defaults модулів 04/06/08, не переписує інваріант «каса не пише баланс».

---

## DL-10-2 · Три зрізи в матриці · 2026-09-04

Мінімум колонок для PM:

| Колонка | Питання |
|---|---|
| KYC when | signup / deposit / withdraw / threshold |
| RG mandatory | які інструменти обов’язкові (deposit limit, self-ex, session…) |
| Bonus | cash vs bonus ring-fence обов’язковий? |

| Варіант | Вердикт |
|---|---|
| Одна глобальна політика «як у нас на desk» | **Reject** для multi-market |
| Матриця UK · MGA · один US-style з різними defaults | **Adopt** |

**Kill.** «Усюди KYC на вивід, бо так у нашому pet project».
