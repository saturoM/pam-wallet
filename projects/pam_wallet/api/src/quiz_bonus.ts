/** Exam for bonus / wagering lecture. Answers stay on the server. */

import type { CheckResult, PublicQuestion, QuizAnswers, QuizPaper, QuizResult } from "./quiz";

type Hidden = {
  choice?: string;
  explanation: string;
};

const BANK: { pub: PublicQuestion; key: Hidden }[] = [
  {
    pub: {
      id: "b1",
      lecture: 1,
      kind: "choice",
      prompt: "Cash $100 + bonus $50. Як тримати в PAM?",
      options: [
        "Одне поле balance=150 і нотатка «50 бонус»",
        "Дві кишені: player_cash і bonus; вивід читає withdrawable",
        "Усе в player_cash — бонус лише UI-бейдж",
      ],
    },
    key: {
      choice: "Дві кишені: player_cash і bonus; вивід читає withdrawable",
      explanation: "Ring-fence. Один баланс з лейблом ламає payout і support.",
    },
  },
  {
    pub: {
      id: "b2",
      lecture: 1,
      kind: "choice",
      prompt: "Welcome grant $50. Це PSP captured?",
      options: [
        "Так — той самий FILL, що депозит",
        "Ні — грант у bonus pocket; картку не списували",
        "Так, якщо касир натиснув Claim",
      ],
    },
    key: {
      choice: "Ні — грант у bonus pocket; картку не списували",
      explanation: "Грант ≠ deposit captured. cash_at_psp від акції сам не росте.",
    },
  },
  {
    pub: {
      id: "b3",
      lecture: 1,
      kind: "choice",
      prompt: "Бонус $50, wagering ×10. Одна ставка $50. Вивести бонус?",
      options: [
        "Так — поставив суму бонуса",
        "Ні — треба оборот ~$500 за правилами",
        "Так, якщо 3DS пройшов",
      ],
    },
    key: {
      choice: "Ні — треба оборот ~$500 за правилами",
      explanation: "Wagering — накопичений turnover, не одна ставка = номінал бонуса.",
    },
  },
  {
    pub: {
      id: "b4",
      lecture: 1,
      kind: "choice",
      prompt: "За правилом модуля: вивід $40 cash, поки $50 bonus не відіграно. Що з бонусом?",
      options: [
        "Лишити bonus як був",
        "Forfeit незакритого bonus",
        "Автоматично unlock bonus у cash",
      ],
    },
    key: {
      choice: "Forfeit незакритого bonus",
      explanation: "Забрав кеш — акція згорає. Інакше abuse-friendly.",
    },
  },
  {
    pub: {
      id: "b5",
      lecture: 1,
      kind: "choice",
      prompt: "KYC ок, але risk: bonus abuse. Що з payout?",
      options: [
        "Одразу payout_sent у PSP",
        "Abuse hold — не кликати PSP, поки ops не вирішить",
        "Self-exclusion на весь акаунт",
      ],
    },
    key: {
      choice: "Abuse hold — не кликати PSP, поки ops не вирішить",
      explanation: "Hold на цьому withdraw. Не freeze/RG і не тихий sent.",
    },
  },
  {
    pub: {
      id: "b6",
      lecture: 1,
      kind: "choice",
      prompt: "Касир на Claim bonus робить balance += 50. Ок?",
      options: [
        "Так — швидше для UX",
        "Ні — касир не пише баланс; грант лише PAM",
        "Так, якщо потім прийде webhook",
      ],
    },
    key: {
      choice: "Ні — касир не пише баланс; грант лише PAM",
      explanation: "Той самий інваріант, що на депозиті.",
    },
  },
  {
    pub: {
      id: "b7",
      lecture: 1,
      kind: "choice",
      prompt: "Abuse hold — це те саме, що AML freeze?",
      options: [
        "Так — один статус blocked",
        "Ні — hold на payout/withdraw; freeze — інший прапорець рахунку",
        "Так — обидва ріжуть лише депозит",
      ],
    },
    key: {
      choice: "Ні — hold на payout/withdraw; freeze — інший прапорець рахунку",
      explanation: "Не змішувати abuse review з AML freeze / self-ex.",
    },
  },
  {
    pub: {
      id: "b8",
      lecture: 1,
      kind: "choice",
      prompt: "Wagering — це…",
      options: [
        "Тумблер «бонус активний»",
        "Лічильник обороту ставок до unlock / виводу з бонуса",
        "Код відмови PSP do_not_honor",
      ],
    },
    key: {
      choice: "Лічильник обороту ставок до unlock / виводу з бонуса",
      explanation: "Прогрес ×N, не одна галочка в UI.",
    },
  },
];

const HINTS: Record<string, string> = {
  b1: "Два баланси, не нотатка.",
  b2: "Грант ≠ картка.",
  b3: "×10 від номіналу, не одна ставка.",
  b4: "Забрав кеш — бонус згорає.",
  b5: "Hold, не sent.",
  b6: "Касир тільки читає.",
  b7: "Різні статуси.",
  b8: "Оборот, не тумблер.",
};

function gradeOne(q: (typeof BANK)[number], raw: QuizAnswers[string] | undefined): boolean {
  return (raw?.choice ?? "") === q.key.choice;
}

export function publicBonusQuiz(): QuizPaper {
  return {
    title: "PAM · Bonus / wagering",
    minutes: 12,
    questions: BANK.map((q) => q.pub),
  };
}

export function gradeBonusQuiz(answers: QuizAnswers): QuizResult {
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

export function checkBonusQuestion(id: string, answer: QuizAnswers[string] | undefined): CheckResult {
  const q = BANK.find((b) => b.pub.id === id);
  if (!q) return { ok: false, hint: "немає такого питання" };
  if (gradeOne(q, answer)) return { ok: true };
  return { ok: false, hint: HINTS[id] ?? q.key.explanation };
}

export function fixturePerfectBonus(): QuizAnswers {
  return Object.fromEntries(BANK.map((q) => [q.pub.id, { choice: q.key.choice }]));
}
