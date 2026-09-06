# Sequence · 11 Platform teardown

Чому так — [`11_decision_log.md`](11_decision_log.md).

**Джерела (2026-09-06).** Публічні help/T&Cs + SoftSwiss KB — не live deposit у cashier. TAKE/FILL для операторів = що політика дозволяє спостерігати / що заявлено; hops — як би TPM мапив власників.

| | Хто |
|---|---|
| Operator A | LeoVegas UK (`leovegas.co.uk` terms + help Verification / RG) |
| Operator B | Slots777 (FAQ + Bonus Policy + T&Cs) |
| PAM vendor | SoftSwiss KB: *iGaming Infrastructure* (PAM / wallet / KYC / RG) |

---

## Шаблон walk (повторювати на кожному бренді)

| Крок | Що дивитись | Ownership |
|---|---|---|
| 1. Реєстрація / до депозиту | Чи просять KYC | FE збирає · PAM тримає статус · KYC vendor webhook |
| 2. Deposit click | Success одразу? 3DS/SCA? | FE TAKE · PSP auth/capture · PAM FILL лише на captured |
| 3. Коли $ у «балансі» | До/після capture | PAM ledger |
| 4. RG | Ліміти, self-ex у кабінеті | PAM гейти |
| 5. Bonus | Окремий баланс? | PAM bonus engine |
| 6. Withdraw | KYC? Pending? | PAM гейт · PSP payout |
| 7. Ставка | Хто ріже при self-ex / insufficient | PAM (не game wallet) |

---

## Порівняльна таблиця

| Колонка | Operator A · LeoVegas UK | Operator B · Slots777 | PAM vendor · SoftSwiss |
|---|---|---|---|
| **KYC when** | Checks до **ставок і виводу** (terms cl.8); docs у Verify Account; типово ID + PoA | Вік/ідентичність; **перед approve withdrawal** можуть вимагати docs; реєстрація + PII на депозит | KYC на lifecycle: registration / deposit / withdrawal (**config**); can skip за правилами ринку |
| **Deposit TAKE vs FILL** | SCA/3DS очікувані (UK); баланс = після успішного платежу, не «клік Success» як правда | Deposit methods у FAQ; min €20; ліміти депозиту в Account — FILL у продукті = після платежу (не розкрито webhook wording) | Wallet+PSP: ledger + SCA e2e; PAM ledger immutable; payments окремий модуль |
| **RG tools visible** | Deposit / session / loss limits, self-exclusion, reality checks у RG section | Deposit & wager limits у Account; temporary/permanent self-exclusion Close Account | Limits, self-exclusion, reality checks **у PAM**; event-driven RG alerts |
| **Withdraw gate** | Verification + payment-method checks; pending до approve | KYC docs before approve; **play-through deposit 1×** (AML); min €25; active bonus **forfeit** on withdraw request; flow-back cancels pending | Withdraw routed via payments; PAM enforce eligibility / KYC / RG before PSP out |
| **Cash vs bonus** | Casino bonus з вейджером; partial withdraw може скасувати bonus (review sources) | **Явний ring-fence**: cash + bonus; **cash-first**; wins→cash; withdraw cash → **forfeit bonus**; cancel bonus лише якщо cash < €0.10 | Multi-balance wallet + ledger; bonus engine у PAM; marketing «single wallet» = unified API, не sticky merge |
| **Notes / smells** | UK-жорсткість: verification може блокувати **play**, не лише payout — ближче до config рядка UK у модулі 10 | Найчистіший публічний cash-first + forfeit (як desk 06). Smell: «always access to funds» поруч із forfeit bonus і 1× playthrough | «Single wallet» у копі vs multi-balance у спекі — на інтервʼю розвести. Ownership: game → wallet API debit/credit; FE не автор книги |

---

## Ownership hops (коротко для 60s)

1. **Deposit click** — FE TAKE (intent).  
2. **3DS/SCA** — банк/PSP, ще не FILL.  
3. **captured / paid** — PSP → PAM **FILL** (ключ платежу).  
4. **Balance UI** — читає PAM snapshot.  
5. **Bet** — game → PAM wallet API; insufficient / RG / self-ex = PAM deny.  
6. **Bonus** — PAM engine (окремий баланс або sticky — продукт).  
7. **Withdraw** — PAM гейти (KYC/RG/bonus) → PSP payout; hold до sent.

---

## Done для модуля

Таблиця заповнена на 2+1 · DL-11-1/2 уже в log · 60s: «на Slots777 FILL/cash-first виглядає так… на LeoVegas UK KYC earlier… SoftSwiss — PAM owns ledger & RG, PSP owns capture, FE не пише баланс».

**Свідомо не покрито:** live deposit у cashier, конкретні PSP імена, lobby/VIP/game mix.
