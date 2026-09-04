/** Exam for KYC / AML lecture. Answers stay on the server. */

import type { CheckResult, PublicQuestion, QuizAnswers, QuizPaper, QuizResult } from "./quiz";

type Hidden = {
  choice?: string;
  explanation: string;
};

const BANK: { pub: PublicQuestion; key: Hidden }[] = [
  {
    pub: {
      id: "k1",
      lecture: 1,
      kind: "choice",
      prompt: "На нашому продукті: гравець без KYC. Deposit і ставка з кишені? Withdraw?",
      options: [
        "Усе заборонено до KYC",
        "Deposit і ставка можна; вивід — ні",
        "Вивід можна; депозит — ні",
      ],
    },
    key: {
      choice: "Deposit і ставка можна; вивід — ні",
      explanation: "KYC на вивід. Депозит без KYC — money-path lock.",
    },
  },
  {
    pub: {
      id: "k2",
      lecture: 1,
      kind: "choice",
      prompt: "Submit KYC що означає?",
      options: [
        "Уже verified; можна виводити",
        "Заявка pending; verified ще немає; вивід ні",
        "FILL у player_cash $0",
      ],
    },
    key: {
      choice: "Заявка pending; verified ще немає; вивід ні",
      explanation: "Submit = TAKE статусу. 0 проводок грошей.",
    },
  },
  {
    pub: {
      id: "k3",
      lecture: 1,
      kind: "choice",
      prompt: "Вендор webhook approved. PAM ще не писав. Ставити kycVerified з відповіді вендора в касі?",
      options: [
        "Так — вендор джерело правди",
        "Ні — FILL статусу лише коли PAM записав прапорець",
        "Так, якщо 3DS теж ok",
      ],
    },
    key: {
      choice: "Ні — FILL статусу лише коли PAM записав прапорець",
      explanation: "Webhook вендора — сигнал. PAM пише verified.",
    },
  },
  {
    pub: {
      id: "k4",
      lecture: 1,
      kind: "choice",
      prompt: "KYC rejected. $10 у bets_in_play (rnd_1). Що з раундом?",
      options: [
        "Void одразу",
        "Lose в house",
        "Раунд живе; reject не void-ить",
      ],
    },
    key: {
      choice: "Раунд живе; reject не void-ить",
      explanation: "KYC ≠ self-ex. Вивід і так закритий без verified.",
    },
  },
  {
    pub: {
      id: "k5",
      lecture: 1,
      kind: "choice",
      prompt: "EDD — це…",
      options: [
        "Той самий Reject і Submit ще раз",
        "Посилена перевірка / третій рівень після звичайного KYC",
        "PSP captured",
      ],
    },
    key: {
      choice: "Посилена перевірка / третій рівень після звичайного KYC",
      explanation: "Enhanced due diligence, не дубль звичайного submit.",
    },
  },
  {
    pub: {
      id: "k6",
      lecture: 1,
      kind: "choice",
      prompt: "Freeze замість «KYC не пройшов». Що не так?",
      options: [
        "Нічого — один blocked на все",
        "Змішали AML freeze і відсутність verified; різні статуси",
        "Треба ще й self-ex",
      ],
    },
    key: {
      choice: "Змішали AML freeze і відсутність verified; різні статуси",
      explanation: "Обидва можуть різати вивід — з різних причин і з різною політикою.",
    },
  },
  {
    pub: {
      id: "k7",
      lecture: 1,
      kind: "choice",
      prompt: "Хто ставить прапорець kycVerified у PAM?",
      options: [
        "Касир на Submit",
        "PAM після approve (compliance / обробка вендора)",
        "Гра на settle",
      ],
    },
    key: {
      choice: "PAM після approve (compliance / обробка вендора)",
      explanation: "Касир і гра не пишуть статус верифікації як джерело правди.",
    },
  },
  {
    pub: {
      id: "k8",
      lecture: 1,
      kind: "choice",
      prompt: "Self-ex vs KYC reject: вивід після того, як документи колись були ок?",
      options: [
        "Обидва завжди блокують вивід назавжди",
        "Self-ex може вивести (KYC як завжди); без verified виводу немає",
        "KYC reject дозволяє вивід; self-ex — ні",
      ],
    },
    key: {
      choice: "Self-ex може вивести (KYC як завжди); без verified виводу немає",
      explanation: "RG платить. Без KYC verified — ні. Freeze — окремо, теж без виводу.",
    },
  },
];

const HINTS: Record<string, string> = {
  k1: "Вивід після verified.",
  k2: "Pending ≠ verified.",
  k3: "PAM пише прапорець.",
  k4: "Не void через KYC.",
  k5: "Третій рівень.",
  k6: "Різні статуси.",
  k7: "Не каса на Submit.",
  k8: "Self-ex платить; треба KYC.",
};

function gradeOne(q: (typeof BANK)[number], raw: QuizAnswers[string] | undefined): boolean {
  return (raw?.choice ?? "") === q.key.choice;
}

export function publicKycQuiz(): QuizPaper {
  return {
    title: "PAM · KYC / AML",
    minutes: 12,
    questions: BANK.map((q) => q.pub),
  };
}

export function gradeKycQuiz(answers: QuizAnswers): QuizResult {
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

export function checkKycQuestion(id: string, answer: QuizAnswers[string] | undefined): CheckResult {
  const q = BANK.find((b) => b.pub.id === id);
  if (!q) return { ok: false, hint: "немає такого питання" };
  if (gradeOne(q, answer)) return { ok: true };
  return { ok: false, hint: HINTS[id] ?? q.key.explanation };
}

export function fixturePerfectKyc(): QuizAnswers {
  return Object.fromEntries(BANK.map((q) => [q.pub.id, { choice: q.key.choice }]));
}
