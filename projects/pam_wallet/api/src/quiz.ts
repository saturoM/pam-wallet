/** Exam for lectures 1–5. Answers stay on the server. */

export type QuizKind = "choice" | "posting" | "numbers";

export type PublicQuestion = {
  id: string;
  lecture: 1 | 2 | 3 | 4 | 5;
  kind: QuizKind;
  prompt: string;
  options?: string[];
  fields?: string[];
};

export type QuizPaper = {
  title: string;
  minutes: number;
  questions: PublicQuestion[];
};

export type PostingAnswer = {
  debit: string;
  credit: string;
  amount: string;
  key: string;
};

export type QuizAnswers = Record<
  string,
  { choice?: string; posting?: PostingAnswer; numbers?: Record<string, string> }
>;

export type GradedItem = {
  id: string;
  ok: boolean;
  explanation: string;
};

export type QuizResult = {
  total: number;
  correct: number;
  items: GradedItem[];
};

type Hidden = {
  choice?: string;
  posting?: { debit: string; credit: string; amount: number; keys: string[] };
  numbers?: Record<string, string>;
  explanation: string;
};

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\$/g, "").replace(/\s+/g, "_").replace(/-+/g, "_");
}

function normAmount(s: string): number {
  const n = Number(String(s).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

function account(s: string): string {
  const x = norm(s);
  if (x === "cash" || x === "account_cash" || x === "cash_account" || x === "playercash") {
    return "player_cash";
  }
  if (x === "psp" || x === "cash_at_psp" || x === "cashatpsp") return "cash_at_psp";
  if (x === "in_play" || x === "inplay" || x === "betsinplay") return "bets_in_play";
  if (x === "hold" || x === "withdraw_hold" || x === "withdrawinflight") return "withdraw_in_flight";
  return x;
}

const BANK: { pub: PublicQuestion; key: Hidden }[] = [
  {
    pub: {
      id: "q1",
      lecture: 1,
      kind: "choice",
      prompt: "Гравець натиснув Deposit $50. 3DS ще не пройшов. Що показує касир як доступно?",
      options: ["$50 у player_cash", "$0", "pending $50, можна ставити"],
    },
    key: {
      choice: "$0",
      explanation: "Intent ще не гроші. Ledger порожній, доступно $0.",
    },
  },
  {
    pub: {
      id: "q2",
      lecture: 1,
      kind: "choice",
      prompt: "3DS успіх, webhook captured ще в дорозі. Чи даємо ставити?",
      options: ["Так, 3DS = гроші", "Ні, кредитимо лише після captured", "Так, якщо касир натиснув Success"],
    },
    key: {
      choice: "Ні, кредитимо лише після captured",
      explanation: "3DS ≠ captured. Ставка з player_cash, а його ще немає.",
    },
  },
  {
    pub: {
      id: "q3",
      lecture: 2,
      kind: "posting",
      prompt: "PSP captured на dep_1, $50. Одна проводка. Credit не порожній.",
    },
    key: {
      posting: {
        debit: "cash_at_psp",
        credit: "player_cash",
        amount: 50,
        keys: ["captured:dep_1", "dep_1"],
      },
      explanation: "debit cash_at_psp, credit player_cash, $50, ключ captured:dep_1.",
    },
  },
  {
    pub: {
      id: "q4",
      lecture: 2,
      kind: "numbers",
      prompt: "Другий webhook captured на той самий dep_1. Після першого в player_cash уже $50.",
      fields: ["new_postings", "player_cash"],
    },
    key: {
      numbers: { new_postings: "0", player_cash: "50" },
      explanation: "Бирка dep_1 уже є. 0 нових рядків, player_cash $50.",
    },
  },
  {
    pub: {
      id: "q5",
      lecture: 2,
      kind: "choice",
      prompt: "Звідки касир бере «доступно» після captured?",
      options: ["З тіла вебхука PSP", "З ledger (сума player_cash)", "З кнопки Deposit Success"],
    },
    key: {
      choice: "З ledger (сума player_cash)",
      explanation: "Касир PSP не читає. Число = проводки player_cash.",
    },
  },
  {
    pub: {
      id: "q6",
      lecture: 3,
      kind: "posting",
      prompt: "Було player_cash $50. place_bet(rnd_1, $10). Одна проводка ставки.",
    },
    key: {
      posting: {
        debit: "player_cash",
        credit: "bets_in_play",
        amount: 10,
        keys: ["bet:rnd_1", "rnd_1"],
      },
      explanation: "Не captured:rnd_1. Ключ ставки — bet:rnd_1.",
    },
  },
  {
    pub: {
      id: "q7",
      lecture: 3,
      kind: "numbers",
      prompt: "Гра ретраїть той самий rnd_1 після вже записаного bet:rnd_1.",
      fields: ["new_postings", "player_cash", "bets_in_play"],
    },
    key: {
      numbers: { new_postings: "0", player_cash: "40", bets_in_play: "10" },
      explanation: "Retry шле гра, не касир. Ключ є → 0 рядків. $40 / $10.",
    },
  },
  {
    pub: {
      id: "q8",
      lecture: 4,
      kind: "posting",
      prompt: "Програш: cash $40, in-play $10, settle(rnd_1, payout=0). Одна проводка. player_cash не чіпати.",
    },
    key: {
      posting: {
        debit: "bets_in_play",
        credit: "house",
        amount: 10,
        keys: ["settle:rnd_1"],
      },
      explanation: "Конверт → house. Кишеня лишається $40.",
    },
  },
  {
    pub: {
      id: "q9",
      lecture: 4,
      kind: "numbers",
      prompt: "Виграш settle(rnd_1, payout=25) замість програшу. Старт: cash $40, in-play $10.",
      fields: ["postings", "player_cash"],
    },
    key: {
      numbers: { postings: "2", player_cash: "65" },
      explanation: "Два рядки: $10 назад + $15 з house. Кишеня $65. Не один рядок на $25.",
    },
  },
  {
    pub: {
      id: "q10",
      lecture: 5,
      kind: "posting",
      prompt: "Intent виводу: cash $50, Withdraw $20, wd_1. PSP ще мовчить.",
    },
    key: {
      posting: {
        debit: "player_cash",
        credit: "withdraw_in_flight",
        amount: 20,
        keys: ["withdraw:wd_1", "wd_1"],
      },
      explanation: "На відміну від депозиту, клік уже проводка hold.",
    },
  },
  {
    pub: {
      id: "q11",
      lecture: 5,
      kind: "choice",
      prompt: "Чому вивід на кліку пише ledger, а депозит pending — ні?",
      options: [
        "Бо KYC вимагає проводку",
        "Депозит: грошей ще немає. Вивід: cash уже наш, інакше їх поставлять",
        "Бо PSP уже відправив payout",
      ],
    },
    key: {
      choice: "Депозит: грошей ще немає. Вивід: cash уже наш, інакше їх поставлять",
      explanation: "Pending депозит = заявка, не проводка. Pending вивід = hold.",
    },
  },
  {
    pub: {
      id: "q12",
      lecture: 1,
      kind: "numbers",
      prompt: "Два кліки Deposit: dep_1 $50 і dep_2 $50. Обидва captured. Скільки в player_cash?",
      fields: ["player_cash"],
    },
    key: {
      numbers: { player_cash: "100" },
      explanation: "Два різні deposit_id = два платежі. $100. Не плутати з двома вебхуками одного dep_1.",
    },
  },
  {
    pub: {
      id: "q13",
      lecture: 1,
      kind: "choice",
      prompt: "На чому ключ ідемпотентності captured, щоб повторна доставка вебхука не кредитила двічі?",
      options: [
        "На id доставки вебхука (evt_…)",
        "На deposit_id (dep_1)",
        "На час кліку Deposit",
      ],
    },
    key: {
      choice: "На deposit_id (dep_1)",
      explanation: "Два листи, один платіж. Ключ на evt_ зробить другий лист другим депозитом.",
    },
  },
  {
    pub: {
      id: "q14",
      lecture: 1,
      kind: "choice",
      prompt: "Deposit pending (PSP ще мовчить). Чи є проводка в ledger?",
      options: ["Так, pending_psp $50", "Ні, лише заявка dep_1", "Так, у gate tape"],
    },
    key: {
      choice: "Ні, лише заявка dep_1",
      explanation: "Заявка ≠ проводка. Gate tape — allow/deny, не баланс.",
    },
  },
  {
    pub: {
      id: "q15",
      lecture: 2,
      kind: "choice",
      prompt: "Що означає проводка з debit і порожнім credit?",
      options: [
        "Нормальний депозит",
        "Вигадав гроші (те саме, що balance +=)",
        "Hold виводу",
      ],
    },
    key: {
      choice: "Вигадав гроші (те саме, що balance +=)",
      explanation: "Завжди два боки однієї суми.",
    },
  },
  {
    pub: {
      id: "q16",
      lecture: 2,
      kind: "choice",
      prompt: "На captured debit — це хто?",
      options: [
        "Гравець (він натиснув Deposit)",
        "Гроші казино на PSP (актив)",
        "House",
      ],
    },
    key: {
      choice: "Гроші казино на PSP (актив)",
      explanation: "Гравець — credit player_cash (ми винні). Не debit.",
    },
  },
  {
    pub: {
      id: "q17",
      lecture: 2,
      kind: "choice",
      prompt: "Credit на captured — це «гроші кудись зникли, ми не знаємо куди»?",
      options: [
        "Так, тому credit порожній",
        "Ні: ті самі $50 підписані як борг гравцю",
        "Так, вони вже в слоті",
      ],
    },
    key: {
      choice: "Ні: ті самі $50 підписані як борг гравцю",
      explanation: "Debit = лежать у нас. Credit = чиї вони. Гроші з PSP не пішли.",
    },
  },
  {
    pub: {
      id: "q18",
      lecture: 3,
      kind: "numbers",
      prompt: "player_cash $50. place_bet(rnd_1, $60). Скільки нових проводок?",
      fields: ["new_postings"],
    },
    key: {
      numbers: { new_postings: "0" },
      explanation: "Немає грошей — немає рядка. Insufficient funds.",
    },
  },
  {
    pub: {
      id: "q19",
      lecture: 3,
      kind: "choice",
      prompt: "Хто шле повторний place_bet з тим самим rnd_1 після таймауту?",
      options: ["Касир", "Гра", "PSP"],
    },
    key: {
      choice: "Гра",
      explanation: "Seamless: гра кличе PAM. Касир депозити/вивід.",
    },
  },
  {
    pub: {
      id: "q20",
      lecture: 3,
      kind: "numbers",
      prompt: "Після bet $10 з cash $50 касир показує два числа. Обидва з ledger.",
      fields: ["available", "in_play"],
    },
    key: {
      numbers: { available: "40", in_play: "10" },
      explanation: "Доступно = player_cash. In-play = bets_in_play. Не одне «баланс 50».",
    },
  },
  {
    pub: {
      id: "q21",
      lecture: 3,
      kind: "choice",
      prompt: "Ключ проводки ставки rnd_1 — який?",
      options: ["captured:rnd_1", "bet:rnd_1", "settle:rnd_1"],
    },
    key: {
      choice: "bet:rnd_1",
      explanation: "captured — депозит. settle — кінець раунду.",
    },
  },
  {
    pub: {
      id: "q22",
      lecture: 4,
      kind: "posting",
      prompt: "Void: in-play $10, settle(rnd_1, payout=10). Одна проводка. Ніхто не виграв.",
    },
    key: {
      posting: {
        debit: "bets_in_play",
        credit: "player_cash",
        amount: 10,
        keys: ["settle:rnd_1"],
      },
      explanation: "Конверт назад у кишеню. House 0.",
    },
  },
  {
    pub: {
      id: "q23",
      lecture: 4,
      kind: "numbers",
      prompt: "Програш payout=0. До цього cash $40, in-play $10. Скільки в player_cash після?",
      fields: ["player_cash"],
    },
    key: {
      numbers: { player_cash: "40" },
      explanation: "$10 уже вийшли на ставці. Кишеню ще раз не чіпаємо.",
    },
  },
  {
    pub: {
      id: "q24",
      lecture: 4,
      kind: "numbers",
      prompt: "Виграш payout=25, ставка була $10. Друга проводка house → player_cash: яка сума (не 25)?",
      fields: ["amount"],
    },
    key: {
      numbers: { amount: "15" },
      explanation: "25 = 10 ставка назад + 15 виграш. House доплачує $15.",
    },
  },
  {
    pub: {
      id: "q25",
      lecture: 4,
      kind: "choice",
      prompt: "Чому виграш $25 — не один рядок house → player_cash на 25?",
      options: [
        "Можна один, так простіше",
        "Тоді $10 лишаться в in-play, раунд ніби живий",
        "Бо KYC",
      ],
    },
    key: {
      choice: "Тоді $10 лишаться в in-play, раунд ніби живий",
      explanation: "Спочатку порожнимо конверт, потім house докладає $15.",
    },
  },
  {
    pub: {
      id: "q26",
      lecture: 4,
      kind: "numbers",
      prompt: "Другий settle того ж rnd_1 після вже закритого раунду. Нових проводок?",
      fields: ["new_postings"],
    },
    key: {
      numbers: { new_postings: "0" },
      explanation: "Конверт порожній. Ключ settle:rnd_1 уже є.",
    },
  },
  {
    pub: {
      id: "q27",
      lecture: 5,
      kind: "numbers",
      prompt: "Cash $50. Клік Withdraw $20, wd_1. PSP ще мовчить. Доступно і hold?",
      fields: ["available", "hold"],
    },
    key: {
      numbers: { available: "30", hold: "20" },
      explanation: "Intent уже зрізав кишеню. Hold, щоб не поставили.",
    },
  },
  {
    pub: {
      id: "q28",
      lecture: 5,
      kind: "posting",
      prompt: "PSP payout_sent на wd_1, hold був $20. Одна проводка. Гроші вийшли з казино.",
    },
    key: {
      posting: {
        debit: "withdraw_in_flight",
        credit: "cash_at_psp",
        amount: 20,
        keys: ["payout:wd_1", "wd_1"],
      },
      explanation: "Hold → PSP. player_cash не чіпаємо (вже зрізали на кліку).",
    },
  },
  {
    pub: {
      id: "q29",
      lecture: 5,
      kind: "posting",
      prompt: "PSP failed на wd_1 після hold $20. Конверт назад у кишеню.",
    },
    key: {
      posting: {
        debit: "withdraw_in_flight",
        credit: "player_cash",
        amount: 20,
        keys: ["payout_fail:wd_1", "payout_failed:wd_1"],
      },
      explanation: "Знову можна ставити. Не house.",
    },
  },
  {
    pub: {
      id: "q30",
      lecture: 5,
      kind: "choice",
      prompt: "Другий payout_sent на той самий wd_1. Що з player_cash?",
      options: [
        "Ще −$20",
        "Не змінюється; 0 нових рядків",
        "Повертається +$20",
      ],
    },
    key: {
      choice: "Не змінюється; 0 нових рядків",
      explanation: "Бирка payout:wd_1 уже є. Кишеню різали на intent, не на вебхуку.",
    },
  },
];

export function publicQuiz(): QuizPaper {
  return {
    title: "PAM · грошовий ланцюжок (лекції 1–5)",
    minutes: 40,
    questions: BANK.map((b) => b.pub),
  };
}

/** Only for tests. Not served on GET /api/quiz. */
export function fixturePerfectAnswers(): QuizAnswers {
  const out: QuizAnswers = {};
  for (const b of BANK) {
    if (b.pub.kind === "choice") out[b.pub.id] = { choice: b.key.choice };
    if (b.pub.kind === "posting" && b.key.posting) {
      const p = b.key.posting;
      out[b.pub.id] = {
        posting: {
          debit: p.debit,
          credit: p.credit,
          amount: String(p.amount),
          key: p.keys[0] ?? "",
        },
      };
    }
    if (b.pub.kind === "numbers" && b.key.numbers) {
      out[b.pub.id] = { numbers: { ...b.key.numbers } };
    }
  }
  return out;
}

function gradeOne(
  q: (typeof BANK)[number],
  raw: QuizAnswers[string] | undefined,
): boolean {
  const k = q.key;
  if (q.pub.kind === "choice") return (raw?.choice ?? "") === k.choice;
  if (q.pub.kind === "posting" && k.posting) {
    const p = raw?.posting;
    if (!p) return false;
    const keyOk = k.posting.keys.some((accept) => norm(p.key) === norm(accept));
    return (
      account(p.debit) === k.posting.debit &&
      account(p.credit) === k.posting.credit &&
      normAmount(p.amount) === k.posting.amount &&
      keyOk
    );
  }
  if (q.pub.kind === "numbers" && k.numbers) {
    const n = raw?.numbers ?? {};
    return Object.entries(k.numbers).every(([f, v]) => norm(n[f] ?? "") === norm(v));
  }
  return false;
}

export function gradeQuiz(answers: QuizAnswers): QuizResult {
  const items: GradedItem[] = BANK.map((q) => ({
    id: q.pub.id,
    ok: gradeOne(q, answers[q.pub.id]),
    explanation: q.key.explanation,
  }));
  return {
    total: items.length,
    correct: items.filter((i) => i.ok).length,
    items,
  };
}

const HINTS: Record<string, string> = {
  q1: "Клік Deposit — TAKE, не FILL. У книзі ще немає рядка.",
  q2: "3DS — банк підтвердив людину, не те що гроші вже в казино.",
  q3: "Два боки: актив на PSP і борг гравцю. Credit не порожній. Ключ — dep_1.",
  q4: "Той самий dep_1. Бирка вже є → новий рядок не пишемо.",
  q5: "Касир не ходить у PSP. Він питає ledger.",
  q6: "Не captured. Ставка: з кишені в конверт in-play. Ключ bet:rnd_1.",
  q7: "Retry шле гра з тим самим rnd_1. Ключ уже є.",
  q8: "Кишеню вже зрізали на ставці. Зараз лише конверт → house.",
  q9: "Не один рядок на $25. Спочатку конверт назад, потім house доплачує різницю.",
  q10: "На виводі клік уже проводка. Інакше цими $20 поставлять.",
  q11: "Депозит pending: грошей ще немає. Вивід pending: гроші вже наші.",
  q12: "Два різні dep_ = два платежі. Два вебхуки одного dep_ — ні.",
  q13: "Ключ на платіж, не на лист. evt_ на кожній доставці інший.",
  q14: "Заявка dep_1 ≠ рядок у книзі. Gate tape — не баланс.",
  q15: "Один бік без другого = balance +=. Гроші з повітря.",
  q16: "Debit — не «хто клікнув». Це де лежать гроші казино.",
  q17: "Credit = чиї $50, не «гроші зникли». З PSP вони не пішли.",
  q18: "Немає $60 у кишені — PAM не вигадує рядок.",
  q19: "Seamless: гра → PAM. Касир депозит/вивід.",
  q20: "Два числа: що можна ставити, і що вже в раунді.",
  q21: "captured — депозит. settle — кінець раунду. Ставка — bet:.",
  q22: "Void = конверт назад у кишеню. House не чіпаємо.",
  q23: "Програш не знімає кишеню вдруге. $10 уже вийшли на bet.",
  q24: "25 − 10 ставки = скільки докладає house.",
  q25: "Один рядок на 25 лишить конверт повним. Раунд не закриється.",
  q26: "Конверт уже порожній. Другий settle — мовчанка.",
  q27: "Intent зрізав кишеню. Різниця лежить у hold.",
  q28: "Hold іде на PSP (гроші вийшли). Кишеню ще раз не ріжемо.",
  q29: "Failed = конверт hold назад у кишеню, не в house.",
  q30: "Той самий wd_1. Кишеню різали на кліку, не на вебхуку.",
};

export type CheckResult = { ok: boolean; hint?: string };

export function checkQuestion(id: string, answer: QuizAnswers[string] | undefined): CheckResult {
  const q = BANK.find((b) => b.pub.id === id);
  if (!q) return { ok: false, hint: "немає такого питання" };
  if (gradeOne(q, answer)) return { ok: true };
  return { ok: false, hint: HINTS[id] ?? q.key.explanation };
}
