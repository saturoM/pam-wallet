/** Exam for recon lecture. Answers stay on the server. */

import type { CheckResult, PublicQuestion, QuizAnswers, QuizPaper, QuizResult } from "./quiz";

type Hidden = {
  choice?: string;
  numbers?: Record<string, string>;
  explanation: string;
};

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\$/g, "").replace(/\s+/g, "_").replace(/-+/g, "_");
}

const BANK: { pub: PublicQuestion; key: Hidden }[] = [
  {
    pub: {
      id: "r1",
      lecture: 1,
      kind: "choice",
      prompt: "Desk показує books balanced. Це означає, що recon з PSP чистий?",
      options: [
        "Так, зелений касир = день закритий",
        "Ні, balanced — лише книга сама з собою",
        "Так, якщо немає відкритих ставок",
      ],
    },
    key: {
      choice: "Ні, balanced — лише книга сама з собою",
      explanation: "Identity ≠ виписка PSP. Recon — дві картини поруч.",
    },
  },
  {
    pub: {
      id: "r2",
      lecture: 1,
      kind: "choice",
      prompt: "Що таке recon на цьому модулі?",
      options: [
        "Нова проводка, щоб цифри збіглись",
        "Звірка сум PAM і PSP за той самий період",
        "Перерахунок доступно в касирі",
      ],
    },
    key: {
      choice: "Звірка сум PAM і PSP за той самий період",
      explanation: "Не рядок книги і не кнопка касира.",
    },
  },
  {
    pub: {
      id: "r3",
      lecture: 1,
      kind: "choice",
      prompt: "PAM captured $50.00, PSP $50.01. Провести recon_adjust $0.01, щоб збіглось?",
      options: ["Так, інакше фінанси не закриють день", "Ні, break не є проводкою", "Так, debit house credit cash_at_psp"],
    },
    key: {
      choice: "Ні, break не є проводкою",
      explanation: "Мовчазний патч ховає діру. Відкрити break, шукати причину.",
    },
  },
  {
    pub: {
      id: "r4",
      lecture: 1,
      kind: "numbers",
      prompt: "PAM Σ captured = $50.00. PSP файл = $50.01. Сума break (додатне число).",
      fields: ["amount"],
    },
    key: {
      numbers: { amount: "0.01" },
      explanation: "$0.01. Не «майже нуль».",
    },
  },
  {
    pub: {
      id: "r5",
      lecture: 1,
      kind: "choice",
      prompt: "Гра двічі послала POST /bets на rnd_1. PAM: один рядок bet:rnd_1. Це recon break?",
      options: [
        "Так, 2 HTTP vs 1 рядок",
        "Ні, той самий round_id — replay, не друга ставка",
        "Так, треба дописати другий bet",
      ],
    },
    key: {
      choice: "Ні, той самий round_id — replay, не друга ставка",
      explanation: "Звіряй ключі раундів, не лічильник HTTP.",
    },
  },
  {
    pub: {
      id: "r6",
      lecture: 1,
      kind: "choice",
      prompt: "PAM і PSP розійшлись. Узяти середнє двох сум як source of truth?",
      options: ["Так, чесно для обох сторін", "Ні, відкрити break і розібрати ключі", "Так, якщо різниця < $1"],
    },
    key: {
      choice: "Ні, відкрити break і розібрати ключі",
      explanation: "Два автори правди = немає правди. Не усереднювати.",
    },
  },
  {
    pub: {
      id: "r7",
      lecture: 1,
      kind: "choice",
      prompt: "Яка формула внутрішньої зведеності на desk?",
      options: [
        "player_cash = cash_at_psp + house",
        "cash_at_psp = player_cash + in-play + withdraw hold + house",
        "available = captured − settled",
      ],
    },
    key: {
      choice: "cash_at_psp = player_cash + in-play + withdraw hold + house",
      explanation: "Це identity книги, не recon vs PSP.",
    },
  },
  {
    pub: {
      id: "r8",
      lecture: 1,
      kind: "choice",
      prompt: "Другий webhook captured на той самий dep_1. PAM 0 нових рядків. PSP теж один capture. Break?",
      options: ["Так, два листи vs один рядок", "Ні, той самий платіж", "Так, треба другий captured"],
    },
    key: {
      choice: "Ні, той самий платіж",
      explanation: "Ключ на dep_1, не на доставку. Як і ставка на rnd_1.",
    },
  },
];

const HINTS: Record<string, string> = {
  r1: "Зелений balanced не дивиться у файл PSP.",
  r2: "Дві картини. Не третій автор книги.",
  r3: "Немає рядка «щоб зійшлось».",
  r4: "50.01 − 50.00.",
  r5: "Той самий rnd_1. HTTP можна слати скільки завгодно.",
  r6: "Середнє — третя вигадана книга.",
  r7: "Сейф = усі конверти, які PAM вважає «в PSP».",
  r8: "Два листи, один dep_1.",
};

function gradeOne(q: (typeof BANK)[number], raw: QuizAnswers[string] | undefined): boolean {
  const k = q.key;
  if (q.pub.kind === "choice") return (raw?.choice ?? "") === k.choice;
  if (q.pub.kind === "numbers" && k.numbers) {
    const n = raw?.numbers ?? {};
    return Object.entries(k.numbers).every(([f, v]) => norm(n[f] ?? "") === norm(v));
  }
  return false;
}

export function publicReconQuiz(): QuizPaper {
  return {
    title: "PAM · recon",
    minutes: 12,
    questions: BANK.map((q) => q.pub),
  };
}

export function gradeReconQuiz(answers: QuizAnswers): QuizResult {
  const items = BANK.map((q) => ({
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

export function checkReconQuestion(id: string, answer: QuizAnswers[string] | undefined): CheckResult {
  const q = BANK.find((b) => b.pub.id === id);
  if (!q) return { ok: false, hint: "немає такого питання" };
  if (gradeOne(q, answer)) return { ok: true };
  return { ok: false, hint: HINTS[id] ?? q.key.explanation };
}

export function fixturePerfectRecon(): QuizAnswers {
  return {
    r1: { choice: "Ні, balanced — лише книга сама з собою" },
    r2: { choice: "Звірка сум PAM і PSP за той самий період" },
    r3: { choice: "Ні, break не є проводкою" },
    r4: { numbers: { amount: "0.01" } },
    r5: { choice: "Ні, той самий round_id — replay, не друга ставка" },
    r6: { choice: "Ні, відкрити break і розібрати ключі" },
    r7: { choice: "cash_at_psp = player_cash + in-play + withdraw hold + house" },
    r8: { choice: "Ні, той самий платіж" },
  };
}
