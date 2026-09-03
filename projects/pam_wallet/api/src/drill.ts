/** Spot-the-slip gym. Answers stay on the server. */

export type DrillKind = "write" | "classify";

export type PublicCard = {
  id: string;
  kind: DrillKind;
  title: string;
  stimulus: string;
  task: string;
  fields?: { id: string; prompt: string; options: string[] }[];
};

export type DrillPaper = {
  title: string;
  minutes: number;
  cards: PublicCard[];
};

export type DrillAnswer = {
  text?: string;
  classify?: Record<string, string>;
};

export type DrillAnswers = Record<string, DrillAnswer>;

export type GradedCard = {
  id: string;
  ok: boolean;
  explanation: string;
};

export type DrillResult = {
  total: number;
  correct: number;
  items: GradedCard[];
};

export type CheckResult = { ok: boolean; hint?: string };

const CLASSIFY = ["факт", "рішення", "задача", "ніщо"] as const;

type Hidden = {
  groups?: string[][];
  classify?: Record<string, string>;
  hint: string;
  explanation: string;
};

function fold(s: string): string {
  return s
    .toLowerCase()
    .replace(/ґ/g, "г")
    .replace(/[''`ʼ]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function groupsOk(text: string, groups: string[][]): boolean {
  const h = fold(text);
  if (!h) return false;
  return groups.every((alts) => alts.some((tok) => h.includes(fold(tok))));
}

const BANK: { pub: PublicCard; key: Hidden }[] = [
  {
    pub: {
      id: "s1",
      kind: "write",
      title: "S1 · tainted log",
      stimulus:
        "DL · Вивід. На депозиті кредит лише після captured, не після 3DS. На виводі теж не можна різати кишеню на кліку: спочатку PSP, потім проводка, як pending депозит. Інакше гравець втратить $ до payout.",
      task: "Який збій? Скільки розвилок у рядку?",
    },
    key: {
      groups: [
        ["дві", "две", "двох", "2 розвил", "two fork", "two forks"],
        ["розвил", "fork"],
        ["депозит", "deposit", "3ds"],
        ["вивід", "вивод", "withdraw"],
      ],
      hint: "Порахуй розвилки. Депозитний pending сюди не копіюється.",
      explanation:
        "Дві розвилки в одному рядку: коли кредитити депозит, і коли холдити вивід. Справжній рядок виводу = DL-4, без 3DS.",
    },
  },
  {
    pub: {
      id: "s2",
      kind: "write",
      title: "S2 · tainted sequence",
      stimulus:
        "Клік Withdraw $20 (wd_1) — TAKE. Заявка pending. Проводки немає. Доступно лишається $65, можна ставити. FILL = payout_sent.",
      task: "Звідки скопійовано цей крок? Що має бути в книзі на кліку (на цьому desk)?",
    },
    key: {
      groups: [
        ["депозит", "deposit", "скопі", "скопи", "copied"],
        ["провод", "hold", "холд", "withdraw:wd", "withdraw wd"],
      ],
      hint: "Pending депозит ≠ pending вивід. На кліку виводу вже є рядок.",
      explanation:
        "Скопійовано депозитний TAKE. Після гейтів клік виводу вже проводка withdraw:wd_1.",
    },
  },
  {
    pub: {
      id: "s3",
      kind: "write",
      title: "S3 · fake invariant",
      stimulus:
        "Інваріант. Гравець не може натиснути Withdraw двічі. Кнопка Withdraw disabled, поки є pending.",
      task: "Чому це не інваріант книги? Який стан має лишатися правдою?",
    },
    key: {
      groups: [
        ["кнопк", "button", "disabled", "ui", "екран"],
        ["стан", "кишен", "player_cash", "hold", "withdraw_in_flight", "книг", "рахунк"],
      ],
      hint: "Інваріант — про рахунки, не про те, що UI дозволяє.",
      explanation:
        "Allowlist кнопки, не стан. Після дозволеного Withdraw $ у withdraw_in_flight, не в player_cash. Другий той самий wd_1 = 0 рядків.",
    },
  },
  {
    pub: {
      id: "s4",
      kind: "write",
      title: "S4 · HTTP as spec",
      stimulus:
        "409 = немає KYC. 403 = немає грошей у player_cash. Касир мапить статус і не читає body.",
      task: "Що вбито в DL-02? Що клієнт має читати?",
    },
    key: {
      groups: [
        ["code", "gate", "код"],
        ["не статус", "не http", "не 409", "не 403", "тіл", "body", "gateblocked", "insufficient"],
      ],
      hint: "Смисл не в числі статусу. На desk 403 = гейт, 409 = немає $.",
      explanation:
        "Статус-як-спека вбито. 403 GateBlocked (різні gate), 409 InsufficientFunds. Клієнт читає code і gate.",
    },
  },
  {
    pub: {
      id: "s5",
      kind: "write",
      title: "S5 · hold after accept",
      stimulus:
        "Adopt. Гейти пройшли → кличемо PSP → якщо PSP прийняв заявку → тоді player_cash → withdraw_in_flight. Так холд збігається з тим, що PSP уже тримає суму.",
      task: "Яка діра між гейтами і accept? Що взяли в DL-4 замість цього?",
    },
    key: {
      groups: [
        ["дір", "між", "жива", "можна постав"],
        ["холд", "hold", "провод"],
        ["до psp", "перед psp", "після гейт", "одразу", "before psp"],
      ],
      hint: "Між гейтами і відповіддю PSP кишеня ще жива.",
      explanation:
        "Між гейтами і accept можна поставити. Adopt: холд одразу після гейтів, потім PSP. Немає $ → немає рядка, PSP не кличемо.",
    },
  },
  {
    pub: {
      id: "s6",
      kind: "classify",
      title: "S6 · classify",
      stimulus: "Для кожного рядка: рішення / факт / задача / ніщо.",
      task: "Один ярлик на рядок.",
      fields: [
        {
          id: "c1",
          prompt: "PSP інколи шле той самий captured двічі.",
          options: [...CLASSIFY],
        },
        {
          id: "c2",
          prompt: "Ключ проводки = captured:dep_1, не evt_…",
          options: [...CLASSIFY],
        },
        {
          id: "c3",
          prompt: "Намалювати таблицю проводок на касирі.",
          options: [...CLASSIFY],
        },
        {
          id: "c4",
          prompt: "У четвер говорили про KYC.",
          options: [...CLASSIFY],
        },
      ],
    },
    key: {
      classify: { c1: "факт", c2: "рішення", c3: "задача", c4: "ніщо" },
      hint: "Факт — що буває. Рішення — що обрали. Задача — зробити екран. Нотатка зустрічі — ніщо з трьох.",
      explanation: "1 факт · 2 рішення · 3 задача · 4 ніщо (meeting note).",
    },
  },
  {
    pub: {
      id: "s7",
      kind: "write",
      title: "S7 · why in the walk",
      stimulus:
        "POST /bets rnd_1 $10 → 200 snapshot. Retry того ж rnd_1 = 0 рядків, бо ідемпотентність у ledger, бо інакше гра зріже двічі, тому ми не робимо transfer wallet.",
      task: "Що зайве в sequence? Куди це подіти?",
    },
    key: {
      groups: [
        ["чому", "why", "зайве", "поясн"],
        ["лог", "decision", "dl-"],
      ],
      hint: "Walk лишає крок і 0 рядків. «Бо» живе в логу.",
      explanation: "«Чому» протік у walk. Sequence лишає крок і 0 рядків. Чому — у decision log / DL-02.",
    },
  },
  {
    pub: {
      id: "s8",
      kind: "write",
      title: "S8 · extra identity",
      stimulus:
        "У контракт додаємо заголовок Idempotency-Key. Body має roundId. Реатрай гри шле новий header і той самий rnd_1. PAM проводить ставку, якщо header новий.",
      task: "Скільки ідентичностей? Що adopt у DL-02-1?",
    },
    key: {
      groups: [
        ["дві ідент", "два ідент", "two ident", "2 ident", "дві id", "два id"],
        ["round", "rnd_1", "тіл", "body", "business"],
        ["заголов", "header", "idempotency"],
      ],
      hint: "Два id = два retry-сюжети. На цьому desk ключ книги походить від roundId.",
      explanation:
        "Дві ідентичності (header і roundId). Adopt: business id у тілі, ключ bet:rnd_1. Окремий header на цьому slice вбито.",
    },
  },
];

function gradeOne(card: (typeof BANK)[number], raw: DrillAnswer | undefined): boolean {
  if (card.pub.kind === "classify" && card.key.classify) {
    const got = raw?.classify ?? {};
    return Object.entries(card.key.classify).every(([id, want]) => fold(got[id] ?? "") === fold(want));
  }
  if (card.pub.kind === "write" && card.key.groups) {
    return groupsOk(raw?.text ?? "", card.key.groups);
  }
  return false;
}

export function publicDrill(): DrillPaper {
  return {
    title: "Spot the slip",
    minutes: 10,
    cards: BANK.map((c) => c.pub),
  };
}

export function gradeDrill(answers: DrillAnswers): DrillResult {
  const items: GradedCard[] = BANK.map((c) => ({
    id: c.pub.id,
    ok: gradeOne(c, answers[c.pub.id]),
    explanation: c.key.explanation,
  }));
  return {
    total: items.length,
    correct: items.filter((i) => i.ok).length,
    items,
  };
}

export function checkCard(id: string, answer: DrillAnswer | undefined): CheckResult {
  const c = BANK.find((b) => b.pub.id === id);
  if (!c) return { ok: false, hint: "немає такої картки" };
  if (gradeOne(c, answer)) return { ok: true };
  return { ok: false, hint: c.key.hint };
}

export function fixturePerfectDrill(): DrillAnswers {
  return {
    s1: {
      text: "Дві розвилки: депозит (3DS vs captured) змішаний з виводом.",
    },
    s2: {
      text: "Скопійовано депозит. На кліку виводу вже проводка withdraw:wd_1.",
    },
    s3: {
      text: "Це кнопка UI, не стан. Інваріант: $ у hold / withdraw_in_flight, не в player_cash.",
    },
    s4: {
      text: "Клієнт читає code і gate в body, не HTTP статус. 403 не KYC.",
    },
    s5: {
      text: "Діра: між гейтами і accept кишеня жива. Холд одразу після гейтів, до PSP.",
    },
    s6: { classify: { c1: "факт", c2: "рішення", c3: "задача", c4: "ніщо" } },
    s7: { text: "Чому зайве в sequence. Подіти в decision log." },
    s8: {
      text: "Дві ідентичності. Беремо roundId у тілі, Idempotency-Key header вбито.",
    },
  };
}
