# Лекція 06 · KYC/KYB + AML як продукт

Одна ідея: у банкінгу перевірка **на вході й постійно**, не лише на вивід (як часто в iGaming desk).

## Міст з PAM module 08

| iGaming desk (типово) | Banking |
|---|---|
| Депозит без KYC, KYC на withdraw | **Onboarding KYC/KYB** до рахунку/картки |
| Vendor approve → PAM пише verified | Те саме: **vendor webhook ≠ account open**, поки ви не записали |
| Reject ≠ void open round | Reject ≠ тихе відкриття лімітів |
| Разовий гейт | + **perpetual** screening (sanctions/PEP), transaction monitoring |

## Три гейти (мінімум)

1. **Open account / activate IBAN**
2. **Send money / higher limits**
3. **Issue card / crypto off-ramp** (якщо є)

KYB (бізнес): директор, UBO, документи компанії — окремий флоу від retail KYC.

## Правило

> Сапорт і гейти читають **ваш** статус (`pending | verified | rejected | review`), не сирий рядок Sumsub/Onfido.

Далі: [`exercises/06_kyb.md`](exercises/06_kyb.md)
