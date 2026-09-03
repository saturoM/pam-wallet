/** Exam for RG lecture. Answers stay on the server. */

import type { CheckResult, PublicQuestion, QuizAnswers, QuizPaper, QuizResult } from "./quiz";

type Hidden = {
  choice?: string;
  explanation: string;
};

const BANK: { pub: PublicQuestion; key: Hidden }[] = [
  {
    pub: {
      id: "g1",
      lecture: 1,
      kind: "choice",
      prompt: "Ліміт депозиту $100. Гравець завів $50. Він ще на сайті? Чи можна поставити $10 з кишені?",
      options: [
        "Вийшов з гри; ставка теж 403",
        "На сайті; ставка з кишені можна, новий депозит понад стелю — ні",
        "На сайті, але вивід заблокований як на freeze",
      ],
    },
    key: {
      choice: "На сайті; ставка з кишені можна, новий депозит понад стелю — ні",
      explanation: "Ліміт — стеля на заведення, не вихід і не стоп ставки.",
    },
  },
  {
    pub: {
      id: "g2",
      lecture: 1,
      kind: "choice",
      prompt: "Self-exclusion vs freeze: що з виводом після KYC?",
      options: [
        "Обидва блокують вивід",
        "Self-ex можна вивести; freeze — ні",
        "Freeze можна вивести; self-ex — ні",
      ],
    },
    key: {
      choice: "Self-ex можна вивести; freeze — ні",
      explanation: "RG віддає кишеню. Freeze (часто AML) тримає рахунок.",
    },
  },
  {
    pub: {
      id: "g3",
      lecture: 1,
      kind: "choice",
      prompt: "Гравець уже self-excluded. Гра шле нову ставку rnd_2. PAM робить void, lose чи gate?",
      options: [
        "Void: прийняти ставку і одразу повернути",
        "Lose: stake в house",
        "Gate: 403, у книзі 0 рядків",
      ],
    },
    key: {
      choice: "Gate: 403, у книзі 0 рядків",
      explanation: "Наперед відомо, що грати не можна. Void — лише раунд, який уже в in-play.",
    },
  },
  {
    pub: {
      id: "g4",
      lecture: 1,
      kind: "choice",
      prompt: "Self-ex, $10 уже в bets_in_play (rnd_1). Вивід цих $10 прямо з раунду?",
      options: [
        "Так, Withdraw по in-play",
        "Ні: спочатку void у кишеню (settle:rnd_1), потім вивід",
        "Так, якщо settle як lose",
      ],
    },
    key: {
      choice: "Ні: спочатку void у кишеню (settle:rnd_1), потім вивід",
      explanation: "In-play не в кишені. Lose віддав би $ казино — це не захист.",
    },
  },
  {
    pub: {
      id: "g5",
      lecture: 1,
      kind: "choice",
      prompt: "Клік Deposit ще active → pending. Далі self-ex. Приходить captured. Кредитити player_cash?",
      options: [
        "Так, заявка створена до прапорця",
        "Так, хай потім виведе",
        "Ні: прапорець читають і на captured; у кишеню не класти",
      ],
    },
    key: {
      choice: "Ні: прапорець читають і на captured; у кишеню не класти",
      explanation: "Інакше FILL на сайт після виключення. Клік і captured — обидва місця.",
    },
  },
  {
    pub: {
      id: "g6",
      lecture: 1,
      kind: "choice",
      prompt: "PSP уже списав картку, PAM кишеню не кредитить (self-ex). Що з грошима?",
      options: [
        "Нічого: зависають у PSP назавжди",
        "Звичайний вивід з кишені",
        "Потрібен refund у PSP (можна пачкою); не withdraw з каси",
      ],
    },
    key: {
      choice: "Потрібен refund у PSP (можна пачкою); не withdraw з каси",
      explanation: "Кишені немає — виводу немає. Третього (ні на картці, ні в PAM) бути не може.",
    },
  },
  {
    pub: {
      id: "g7",
      lecture: 1,
      kind: "choice",
      prompt: "Freeze хто вмикає і навіщо?",
      options: [
        "Гравець, щоб менше ставити — це RG",
        "Оператор (часто AML/фрод); виводу немає",
        "PSP, коли captured не дійшов",
      ],
    },
    key: {
      choice: "Оператор (часто AML/фрод); виводу немає",
      explanation: "Не «жорсткіший self-ex». Інший прапорець.",
    },
  },
  {
    pub: {
      id: "g8",
      lecture: 1,
      kind: "choice",
      prompt: "Self-exclusion у PAM — це проводка чи що?",
      options: [
        "Проводка: debit player_cash credit house",
        "Прапорець статусу; гейти на діях; гроші самі не їдуть",
        "Той самий рядок, що void rnd_1",
      ],
    },
    key: {
      choice: "Прапорець статусу; гейти на діях; гроші самі не їдуть",
      explanation: "status = self_excluded. Void / refund — окремі дії по тому, що вже висіло.",
    },
  },
];

const HINTS: Record<string, string> = {
  g1: "Стеля на покласти, не на поставити з кишені.",
  g2: "RG платить. AML тримає.",
  g3: "Новий клік не приймають. Void — для rnd_1, який уже є.",
  g4: "Спочатку кишеня, потім Withdraw.",
  g5: "Captured теж читає прапорець.",
  g6: "Повернення на картку = PSP, не каса.",
  g7: "Не гравець «хочу менше грати».",
  g8: "Один біт. Не рядок книги.",
};

function gradeOne(q: (typeof BANK)[number], raw: QuizAnswers[string] | undefined): boolean {
  return (raw?.choice ?? "") === q.key.choice;
}

export function publicRgQuiz(): QuizPaper {
  return {
    title: "PAM · RG",
    minutes: 12,
    questions: BANK.map((q) => q.pub),
  };
}

export function gradeRgQuiz(answers: QuizAnswers): QuizResult {
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

export function checkRgQuestion(id: string, answer: QuizAnswers[string] | undefined): CheckResult {
  const q = BANK.find((b) => b.pub.id === id);
  if (!q) return { ok: false, hint: "немає такого питання" };
  if (gradeOne(q, answer)) return { ok: true };
  return { ok: false, hint: HINTS[id] ?? q.key.explanation };
}

export function fixturePerfectRg(): QuizAnswers {
  return Object.fromEntries(BANK.map((q) => [q.pub.id, { choice: q.key.choice }]));
}
