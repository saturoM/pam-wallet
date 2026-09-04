export type DepositStatus = "pending" | "captured" | "failed";
export type RoundStatus = "open" | "settled";
export type PlayerStatus = "active" | "self_excluded" | "frozen";
export type KycStatus = "none" | "pending" | "approved" | "rejected";

export type CashierView = {
  availableCents: number;
  inPlayCents: number;
  withdrawPendingCents: number;
  lastDepositStatus: DepositStatus | null;
};

export type PlayerView = {
  status: PlayerStatus;
  dailyLimitCents: number;
  usedDepositCents: number;
  remainingDepositCents: number;
  kycVerified: boolean;
  kycStatus: KycStatus;
  kycOnDeposit: false;
};

export type GateDecision = {
  action: "deposit" | "bet" | "withdraw" | "kyc";
  playerId: string;
  result: "allow" | "deny";
  gate: string;
  message: string;
};

export type Deposit = {
  depositId: string;
  playerId: string;
  amountCents: number;
  status: DepositStatus;
  pspTransactionId: string | null;
};

export type Withdrawal = {
  withdrawId: string;
  playerId: string;
  amountCents: number;
  status: "pending" | "sent" | "failed";
  pspTransactionId: string | null;
};

export type KycCase = {
  kycId: string;
  playerId: string;
  status: "pending" | "approved" | "rejected";
};

export type Round = {
  roundId: string;
  playerId: string;
  stakeCents: number;
  status: RoundStatus;
  payoutCents: number | null;
};

export type Posting = {
  debit: string;
  credit: string;
  amountCents: number;
  idempotencyKey: string;
  event: string;
};

export type MoneyKind = "captured" | "payout" | "fee" | "chargeback";

export type PspLine = {
  kind: MoneyKind;
  amountCents: number;
  ref: string;
};

export type ReconTotals = Record<MoneyKind, number>;

export type ReconBreak = {
  kind: MoneyKind;
  pamCents: number;
  pspCents: number;
  amountCents: number;
};

export type ReconReport = {
  booksOk: boolean;
  clean: boolean;
  pam: ReconTotals;
  psp: ReconTotals;
  breaks: ReconBreak[];
  notBreaks: { id: string; detail: string }[];
};

export type DeskSnapshot = {
  booksOk: boolean;
  cashAtPspCents: number;
  houseCents: number;
  cashiers: Record<string, CashierView>;
  players: Record<string, PlayerView>;
  deposits: Deposit[];
  withdrawals: Withdrawal[];
  kycCases: KycCase[];
  rounds: Round[];
  postings: Posting[];
  gateLog: GateDecision[];
  pspFile: PspLine[];
  recon: ReconReport | null;
};

const idlePlayer: PlayerView = {
  status: "active",
  dailyLimitCents: 10_000,
  usedDepositCents: 0,
  remainingDepositCents: 10_000,
  kycVerified: false,
  kycStatus: "none",
  kycOnDeposit: false,
};

export const emptyDesk: DeskSnapshot = {
  booksOk: true,
  cashAtPspCents: 0,
  houseCents: 0,
  cashiers: {
    p_1: { availableCents: 0, inPlayCents: 0, withdrawPendingCents: 0, lastDepositStatus: null },
    p_2: { availableCents: 0, inPlayCents: 0, withdrawPendingCents: 0, lastDepositStatus: null },
  },
  players: { p_1: idlePlayer, p_2: idlePlayer },
  deposits: [],
  withdrawals: [],
  kycCases: [],
  rounds: [],
  postings: [],
  gateLog: [],
  pspFile: [],
  recon: null,
};

export class ApiError extends Error {
  code: string;
  gate?: string;
  constructor(message: string, code: string, gate?: string) {
    super(message);
    this.code = code;
    this.gate = gate;
  }
}

async function send(path: string, init?: RequestInit): Promise<DeskSnapshot> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const data = (await res.json()) as DeskSnapshot & {
    error?: string;
    code?: string;
    gate?: string;
  };
  if (!res.ok) throw new ApiError(data.error ?? res.statusText, data.code ?? "Error", data.gate);
  return data;
}

export async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const data = (await res.json()) as T & { error?: string; code?: string; gate?: string };
  if (!res.ok) throw new ApiError(data.error ?? res.statusText, data.code ?? "Error", data.gate);
  return data;
}

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

export type QuizResult = {
  total: number;
  correct: number;
  items: { id: string; ok: boolean; explanation: string }[];
};

export type CheckResult = { ok: boolean; hint?: string };

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

export const drillApi = {
  paper: () => json<DrillPaper>("/api/drill"),
  check: (id: string, answer: DrillAnswer) =>
    json<CheckResult>("/api/drill/check", {
      method: "POST",
      body: JSON.stringify({ id, answer }),
    }),
  grade: (answers: DrillAnswers) =>
    json<QuizResult>("/api/drill/grade", {
      method: "POST",
      body: JSON.stringify({ answers }),
    }),
};

export const quizApi = {
  paper: () => json<QuizPaper>("/api/quiz"),
  check: (id: string, answer: QuizAnswers[string]) =>
    json<CheckResult>("/api/quiz/check", {
      method: "POST",
      body: JSON.stringify({ id, answer }),
    }),
  grade: (answers: QuizAnswers) =>
    json<QuizResult>("/api/quiz/grade", {
      method: "POST",
      body: JSON.stringify({ answers }),
    }),
};

export const reconQuizApi = {
  paper: () => json<QuizPaper>("/api/quiz/recon"),
  check: (id: string, answer: QuizAnswers[string]) =>
    json<CheckResult>("/api/quiz/recon/check", {
      method: "POST",
      body: JSON.stringify({ id, answer }),
    }),
  grade: (answers: QuizAnswers) =>
    json<QuizResult>("/api/quiz/recon/grade", {
      method: "POST",
      body: JSON.stringify({ answers }),
    }),
};

export const rgQuizApi = {
  paper: () => json<QuizPaper>("/api/quiz/rg"),
  check: (id: string, answer: QuizAnswers[string]) =>
    json<CheckResult>("/api/quiz/rg/check", {
      method: "POST",
      body: JSON.stringify({ id, answer }),
    }),
  grade: (answers: QuizAnswers) =>
    json<QuizResult>("/api/quiz/rg/grade", {
      method: "POST",
      body: JSON.stringify({ answers }),
    }),
};

export const pspQuizApi = {
  paper: () => json<QuizPaper>("/api/quiz/psp"),
  check: (id: string, answer: QuizAnswers[string]) =>
    json<CheckResult>("/api/quiz/psp/check", {
      method: "POST",
      body: JSON.stringify({ id, answer }),
    }),
  grade: (answers: QuizAnswers) =>
    json<QuizResult>("/api/quiz/psp/grade", {
      method: "POST",
      body: JSON.stringify({ answers }),
    }),
};

export const api = {
  desk: () => send("/api/desk"),
  reset: () => send("/api/reset", { method: "POST" }),
  deposit: (playerId: string, amountCents: number, depositId: string) =>
    send("/api/deposits", {
      method: "POST",
      body: JSON.stringify({ playerId, amountCents, depositId }),
    }),
  webhook: (depositId: string, status: string, pspTransactionId: string) =>
    send("/api/psp-webhook", {
      method: "POST",
      body: JSON.stringify({ depositId, status, pspTransactionId }),
    }),
  bet: (playerId: string, roundId: string, stakeCents: number) =>
    send("/api/bets", {
      method: "POST",
      body: JSON.stringify({ playerId, roundId, stakeCents }),
    }),
  settle: (roundId: string, payoutCents: number) =>
    send("/api/settle", {
      method: "POST",
      body: JSON.stringify({ roundId, payoutCents }),
    }),
  setStatus: (playerId: string, status: PlayerStatus) =>
    send("/api/player-status", {
      method: "POST",
      body: JSON.stringify({ playerId, status }),
    }),
  submitKyc: (playerId: string, kycId: string) =>
    send("/api/kyc", {
      method: "POST",
      body: JSON.stringify({ playerId, kycId }),
    }),
  reviewKyc: (kycId: string, status: "approved" | "rejected") =>
    send("/api/kyc-review", {
      method: "POST",
      body: JSON.stringify({ kycId, status }),
    }),
  withdraw: (playerId: string, amountCents: number, withdrawId: string) =>
    send("/api/withdrawals", {
      method: "POST",
      body: JSON.stringify({ playerId, amountCents, withdrawId }),
    }),
  payout: (withdrawId: string, status: string, pspTransactionId: string) =>
    send("/api/payout-webhook", {
      method: "POST",
      body: JSON.stringify({ withdrawId, status, pspTransactionId }),
    }),
  runRecon: () => send("/api/recon", { method: "POST", body: "{}" }),
  plantPspFee: () => send("/api/recon/plant/fee", { method: "POST", body: "{}" }),
  plantPspChargeback: () => send("/api/recon/plant/chargeback", { method: "POST", body: "{}" }),
  plantGhostCapture: () => send("/api/recon/plant/ghost-capture", { method: "POST", body: "{}" }),
  postPspFee: () => send("/api/recon/fix/fee", { method: "POST", body: "{}" }),
  postChargeback: () => send("/api/recon/fix/chargeback", { method: "POST", body: "{}" }),
  reconAdjust: () => send("/api/recon/fix/adjust", { method: "POST", body: "{}" }),
};

export function usd(cents: number): string {
  const abs = Math.abs(cents) / 100;
  const body = abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return cents < 0 ? `−$${body}` : `$${body}`;
}
