/** Exam for PSP routing lecture. Answers stay on the server. */

import type { CheckResult, PublicQuestion, QuizAnswers, QuizPaper, QuizResult } from "./quiz";

type Hidden = {
  choice?: string;
  explanation: string;
};

const BANK: { pub: PublicQuestion; key: Hidden }[] = [
  {
    pub: {
      id: "p1",
      lecture: 1,
      kind: "choice",
      prompt: "3DS пройшов успішно. Кредитити player_cash зараз?",
      options: [
        "Так — банк уже підтвердив людину",
        "Ні — чекати PSP captured",
        "Так, якщо касир намалював Success",
      ],
    },
    key: {
      choice: "Ні — чекати PSP captured",
      explanation: "3DS = автентифікація, не FILL. Гроші в кишені лише після captured.",
    },
  },
  {
    pub: {
      id: "p2",
      lecture: 1,
      kind: "choice",
      prompt: "Гравець закрив вікно 3DS. Що з dep_1?",
      options: [
        "Залишити pending і тихо зробити captured",
        "dep_1 → failed; нова спроба лише з новим deposit_id",
        "Повторити той самий dep_1 як capture без гравця",
      ],
    },
    key: {
      choice: "dep_1 → failed; нова спроба лише з новим deposit_id",
      explanation: "Немає retry 3DS fail як capture. Друга спроба = новий ключ.",
    },
  },
  {
    pub: {
      id: "p3",
      lecture: 1,
      kind: "choice",
      prompt: "Soft decline на PSP-A. Cascade на PSP-B — який deposit_id?",
      options: [
        "Той самий dep_1, просто інший PSP",
        "Новий dep_2 на B; dep_1 лишається failed",
        "Два captured на один dep_1",
      ],
    },
    key: {
      choice: "Новий dep_2 на B; dep_1 лишається failed",
      explanation: "Cascade = нова спроба. Ключ книги не переїжджає між провайдерами.",
    },
  },
  {
    pub: {
      id: "p4",
      lecture: 1,
      kind: "choice",
      prompt: "Hard decline (do not honor / stolen card). Cascade?",
      options: [
        "Так, по всіх PSP поки хтось не візьме",
        "Ні — стоп на цьому fail",
        "Так, але лише на той самий dep_1",
      ],
    },
    key: {
      choice: "Ні — стоп на цьому fail",
      explanation: "Hard = не робити. Cascade тут = ризик і спам, не конверсія.",
    },
  },
  {
    pub: {
      id: "p5",
      lecture: 1,
      kind: "choice",
      prompt: "Ідемпотентність FILL: який ключ у книзі?",
      options: [
        "evt_… id доставки webhook",
        "deposit_id (напр. dep_1)",
        "час кліку в касі",
      ],
    },
    key: {
      choice: "deposit_id (напр. dep_1)",
      explanation: "Повторна доставка webhook з новим evt_ не створює другу проводку.",
    },
  },
  {
    pub: {
      id: "p6",
      lecture: 1,
      kind: "choice",
      prompt: "PSP прислав код, якого немає в нашій карті статусів. Що робити?",
      options: [
        "Покласти captured «на всяк випадок»",
        "failed (або pending+алерт) — не вигадувати FILL",
        "Ігнорувати webhook",
      ],
    },
    key: {
      choice: "failed (або pending+алерт) — не вигадувати FILL",
      explanation: "Невідомий код ≠ гроші. Безпечніше fail, ніж тихий кредит.",
    },
  },
  {
    pub: {
      id: "p7",
      lecture: 1,
      kind: "choice",
      prompt: "Routing — це…",
      options: [
        "Вибір, який слот показати в лобі",
        "Правило, який PSP бере цей клік депозиту",
        "Повтор failed як captured для конверсії",
      ],
    },
    key: {
      choice: "Правило, який PSP бере цей клік депозиту",
      explanation: "Кого кликнути першим (країна / метод / health / ціна).",
    },
  },
  {
    pub: {
      id: "p8",
      lecture: 1,
      kind: "choice",
      prompt: "Hosted page PSP vs свої поля картки на домені казино — головний сенс для PM?",
      options: [
        "Колір кнопки Deposit",
        "Хто тримає PCI scope (поля картки)",
        "Чи можна кредитити до 3DS",
      ],
    },
    key: {
      choice: "Хто тримає PCI scope (поля картки)",
      explanation: "Footnote модуля: UI-оболонка = PCI, не заміна правила FILL=captured.",
    },
  },
];

const HINTS: Record<string, string> = {
  p1: "3DS ≠ гроші в кишені.",
  p2: "Fail мертвий. Нова спроба = новий id.",
  p3: "Два провайдери — два deposit_id.",
  p4: "Hard = стоп.",
  p5: "Не id доставки.",
  p6: "Не вигадуй captured.",
  p7: "Кого кликнути, не що в лобі.",
  p8: "PCI, не FILL.",
};

function gradeOne(q: (typeof BANK)[number], raw: QuizAnswers[string] | undefined): boolean {
  return (raw?.choice ?? "") === q.key.choice;
}

export function publicPspQuiz(): QuizPaper {
  return {
    title: "PAM · PSP routing",
    minutes: 12,
    questions: BANK.map((q) => q.pub),
  };
}

export function gradePspQuiz(answers: QuizAnswers): QuizResult {
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

export function checkPspQuestion(id: string, answer: QuizAnswers[string] | undefined): CheckResult {
  const q = BANK.find((b) => b.pub.id === id);
  if (!q) return { ok: false, hint: "немає такого питання" };
  if (gradeOne(q, answer)) return { ok: true };
  return { ok: false, hint: HINTS[id] ?? q.key.explanation };
}

export function fixturePerfectPsp(): QuizAnswers {
  return Object.fromEntries(BANK.map((q) => [q.pub.id, { choice: q.key.choice }]));
}
