# Sequence · 11 Platform teardown

Чому так — [`11_decision_log.md`](11_decision_log.md).

Виконання: відкрити 2 живі cashier (або sandbox) + 1 PAM vendor docs. Заповнити таблицю. Нижче — **шаблон** + приклад рядків (замінити на свої спостереження при real walk).

---

## Шаблон walk (повторювати на кожному бренді)

| Крок | Що дивитись | Хто власник (PAM/PSP/game/FE) |
|---|---|---|
| 1. Реєстрація / до депозиту | Чи просять KYC | |
| 2. Deposit click | Success одразу? 3DS? | FE vs PAM vs PSP |
| 3. Коли $ у «балансі» | До/після capture | |
| 4. RG | Ліміти, self-ex у кабінеті | PAM |
| 5. Bonus | Окремий баланс? | PAM |
| 6. Withdraw | KYC? Pending? | PAM + PSP |
| 7. Ставка | Хто ріже, якщо self-ex | PAM vs game |

---

## Порівняльна таблиця (заповнити)

| Колонка | Operator A | Operator B | PAM vendor doc |
|---|---|---|---|
| KYC when | _ | _ | _ |
| Deposit TAKE vs FILL | _ | _ | _ |
| RG tools visible | _ | _ | _ |
| Withdraw gate | _ | _ | _ |
| Cash vs bonus | _ | _ | _ |
| Notes / smells | _ | _ | _ |

Приклад smell: Success у UI до 3DS · один Balance з бонусом · вивід без видимого KYC на ринку, де він має бути.

---

## Done для модуля

Таблиця заповнена на 2+1 джерелах · у log є DL-11-1/2 · можна розказати 60s: «на A FILL виглядає так… власник hops — …».

Не лобі, не VIP, не game mix.
