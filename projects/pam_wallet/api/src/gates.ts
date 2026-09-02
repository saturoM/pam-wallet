import { GateBlocked } from "./ledger";

/** Deposit/bet = thin entry. Withdraw = thick: KYC on, freeze blocks, self-exclusion still pays out. */

export const MIN_DEPOSIT_CENTS = 1000; // $10
export const MAX_DEPOSIT_CENTS = 20_000; // $200
export const DAILY_DEPOSIT_LIMIT_CENTS = 10_000; // $100
export const MIN_WITHDRAW_CENTS = 1000; // $10

export type PlayerStatus = "active" | "self_excluded" | "frozen";
export type GateAction = "deposit" | "bet" | "withdraw" | "kyc";
export type KycStatus = "none" | "pending" | "approved" | "rejected";

export type GateDecision = {
  action: GateAction;
  playerId: string;
  result: "allow" | "deny";
  gate: string;
  message: string;
};

export type PlayerGateState = {
  status: PlayerStatus;
  dailyLimitCents: number;
  kycVerified: boolean;
  kycStatus: KycStatus;
};

export function defaultPlayerState(): PlayerGateState {
  return {
    status: "active",
    dailyLimitCents: DAILY_DEPOSIT_LIMIT_CENTS,
    kycVerified: false,
    kycStatus: "none",
  };
}

function assertNotFrozen(playerId: string, status: PlayerStatus, action: GateAction): void {
  if (status === "frozen") {
    throw new GateBlocked("FROZEN", `${action} blocked: ${playerId} is frozen (no new entries)`);
  }
}

function assertCanEnter(playerId: string, status: PlayerStatus, action: GateAction): void {
  if (status === "self_excluded") {
    throw new GateBlocked("SELF_EXCLUDED", `${action} blocked: ${playerId} is self-excluded`);
  }
  assertNotFrozen(playerId, status, action);
}

export function assertDepositGates(args: {
  playerId: string;
  status: PlayerStatus;
  amountCents: number;
  usedDepositCents: number;
  dailyLimitCents: number;
}): void {
  assertCanEnter(args.playerId, args.status, "deposit");
  if (args.amountCents < MIN_DEPOSIT_CENTS) {
    throw new GateBlocked("AMOUNT_MIN", `deposit below min $${MIN_DEPOSIT_CENTS / 100}`);
  }
  if (args.amountCents > MAX_DEPOSIT_CENTS) {
    throw new GateBlocked("AMOUNT_MAX", `deposit above max $${MAX_DEPOSIT_CENTS / 100}`);
  }
  const remaining = args.dailyLimitCents - args.usedDepositCents;
  if (args.amountCents > remaining) {
    throw new GateBlocked(
      "RG_DEPOSIT_LIMIT",
      `daily deposit remaining $${(remaining / 100).toFixed(2)} of $${args.dailyLimitCents / 100}`,
    );
  }
}

export function assertBetGates(playerId: string, status: PlayerStatus): void {
  assertCanEnter(playerId, status, "bet");
}

export function assertWithdrawGates(args: {
  playerId: string;
  status: PlayerStatus;
  kycVerified: boolean;
  amountCents: number;
}): void {
  assertNotFrozen(args.playerId, args.status, "withdraw");
  if (!args.kycVerified) {
    throw new GateBlocked("KYC_REQUIRED", "withdraw blocked: KYC not verified");
  }
  if (args.amountCents < MIN_WITHDRAW_CENTS) {
    throw new GateBlocked("AMOUNT_MIN", `withdraw below min $${MIN_WITHDRAW_CENTS / 100}`);
  }
}
