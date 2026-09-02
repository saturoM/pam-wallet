import {
  assertBetGates,
  assertDepositGates,
  assertWithdrawGates,
  defaultPlayerState,
  type GateDecision,
  type PlayerGateState,
  type PlayerStatus,
} from "./gates";
import { GateBlocked, InsufficientFunds, Ledger, LedgerError, type Posting } from "./ledger";

export const HOUSE = "house";
export const PLAYERS = ["p_1", "p_2"] as const;
export type PlayerId = (typeof PLAYERS)[number] | string;

export function cashAcct(playerId: string): string {
  return `player_cash:${playerId}`;
}

export function inPlayAcct(playerId: string): string {
  return `bets_in_play:${playerId}`;
}

export function withdrawAcct(playerId: string): string {
  return `withdraw_in_flight:${playerId}`;
}

export type DepositStatus = "pending" | "captured" | "failed";
export type RoundStatus = "open" | "settled";
export type WithdrawStatus = "pending" | "sent" | "failed";
export type KycCaseStatus = "pending" | "approved" | "rejected";

export type Deposit = {
  depositId: string;
  playerId: string;
  amountCents: number;
  status: DepositStatus;
  pspTransactionId: string | null;
};

export type Round = {
  roundId: string;
  playerId: string;
  stakeCents: number;
  status: RoundStatus;
  payoutCents: number | null;
};

export type Withdrawal = {
  withdrawId: string;
  playerId: string;
  amountCents: number;
  status: WithdrawStatus;
  pspTransactionId: string | null;
};

export type KycCase = {
  kycId: string;
  playerId: string;
  status: KycCaseStatus;
};

export type CashierView = {
  availableCents: number;
  inPlayCents: number;
  withdrawPendingCents: number;
  lastDepositStatus: DepositStatus | null;
};

export type PlayerView = PlayerGateState & {
  usedDepositCents: number;
  remainingDepositCents: number;
  kycOnDeposit: false;
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
};

export class Pam {
  readonly ledger = new Ledger();
  private readonly deposits = new Map<string, Deposit>();
  private readonly withdrawals = new Map<string, Withdrawal>();
  private readonly kycCases = new Map<string, KycCase>();
  private readonly pspTxnToDeposit = new Map<string, string>();
  private readonly pspTxnToWithdraw = new Map<string, string>();
  private readonly rounds = new Map<string, Round>();
  private readonly playerState = new Map<string, PlayerGateState>();
  private readonly gateLog: GateDecision[] = [];

  private stateOf(playerId: string): PlayerGateState {
    let s = this.playerState.get(playerId);
    if (!s) {
      s = defaultPlayerState();
      this.playerState.set(playerId, s);
    }
    return s;
  }

  setPlayerStatus(playerId: string, status: PlayerStatus): void {
    this.stateOf(playerId).status = status;
  }

  private pendingKyc(playerId: string): KycCase | undefined {
    return [...this.kycCases.values()].find((c) => c.playerId === playerId && c.status === "pending");
  }

  /** Cashier TAKE. Not verified until compliance approves. No posting. */
  submitKyc(playerId: string, kycId: string): KycCase {
    const existing = this.kycCases.get(kycId);
    if (existing) return existing;
    const st = this.stateOf(playerId);
    if (st.kycVerified) {
      const e = new GateBlocked("KYC_ALREADY_VERIFIED", "KYC already approved");
      this.record({
        action: "kyc",
        playerId,
        result: "deny",
        gate: e.gate,
        message: e.message,
      });
      throw e;
    }
    const pending = this.pendingKyc(playerId);
    if (pending) {
      const e = new GateBlocked("KYC_PENDING", `KYC ${pending.kycId} still awaiting review`);
      this.record({
        action: "kyc",
        playerId,
        result: "deny",
        gate: e.gate,
        message: e.message,
      });
      throw e;
    }
    this.record({
      action: "kyc",
      playerId,
      result: "allow",
      gate: "PASS",
      message: "KYC submitted; not verified until compliance approves",
    });
    const kyc: KycCase = { kycId, playerId, status: "pending" };
    this.kycCases.set(kycId, kyc);
    st.kycStatus = "pending";
    return kyc;
  }

  /** Compliance FILL. Approve unlocks withdraw. Reject does not. Duplicate review is a no-op. */
  reviewKyc(kycId: string, status: "approved" | "rejected"): KycCase {
    const kyc = this.kycCases.get(kycId);
    if (!kyc) throw new LedgerError(`unknown kyc_id ${kycId}`);
    if (kyc.status === "approved" || kyc.status === "rejected") return kyc;
    const st = this.stateOf(kyc.playerId);
    kyc.status = status;
    if (status === "approved") {
      st.kycVerified = true;
      st.kycStatus = "approved";
      this.record({
        action: "kyc",
        playerId: kyc.playerId,
        result: "allow",
        gate: "KYC_APPROVED",
        message: "compliance approved; withdraw gate open",
      });
    } else {
      st.kycVerified = false;
      st.kycStatus = "rejected";
      this.record({
        action: "kyc",
        playerId: kyc.playerId,
        result: "deny",
        gate: "KYC_REJECTED",
        message: "compliance rejected; withdraw still blocked",
      });
    }
    return kyc;
  }

  /** Pending + captured occupy RG room. Failed does not. */
  usedDepositCents(playerId: string): number {
    return [...this.deposits.values()]
      .filter((d) => d.playerId === playerId && d.status !== "failed")
      .reduce((s, d) => s + d.amountCents, 0);
  }

  private record(decision: GateDecision): void {
    this.gateLog.push(decision);
  }

  requestDeposit(playerId: string, amountCents: number, depositId: string): Deposit {
    if (amountCents <= 0) throw new LedgerError("amount must be positive");
    const existing = this.deposits.get(depositId);
    if (existing) return existing;
    const st = this.stateOf(playerId);
    try {
      assertDepositGates({
        playerId,
        status: st.status,
        amountCents,
        usedDepositCents: this.usedDepositCents(playerId),
        dailyLimitCents: st.dailyLimitCents,
      });
    } catch (e) {
      if (e instanceof GateBlocked) {
        this.record({
          action: "deposit",
          playerId,
          result: "deny",
          gate: e.gate,
          message: e.message,
        });
      }
      throw e;
    }
    this.record({
      action: "deposit",
      playerId,
      result: "allow",
      gate: "PASS",
      message: "thin deposit gates passed; PSP not yet captured",
    });
    const dep: Deposit = {
      depositId,
      playerId,
      amountCents,
      status: "pending",
      pspTransactionId: null,
    };
    this.deposits.set(depositId, dep);
    return dep;
  }

  onPspWebhook(depositId: string, status: string, pspTransactionId: string): Deposit {
    const dep = this.deposits.get(depositId);
    if (!dep) throw new LedgerError(`unknown deposit_id ${depositId}`);

    const mapped = this.pspTxnToDeposit.get(pspTransactionId);
    if (mapped && mapped !== depositId) {
      throw new LedgerError("psp_transaction_id already bound to another deposit");
    }

    if (dep.status === "captured" || dep.status === "failed") return dep;

    if (status === "captured") {
      const applied = this.ledger.post({
        debit: "cash_at_psp",
        credit: cashAcct(dep.playerId),
        amountCents: dep.amountCents,
        idempotencyKey: `captured:${depositId}`,
        event: "deposit_captured",
      });
      if (applied) {
        dep.status = "captured";
        dep.pspTransactionId = pspTransactionId;
        this.pspTxnToDeposit.set(pspTransactionId, depositId);
      }
      return dep;
    }

    if (status === "failed") {
      dep.status = "failed";
      return dep;
    }

    throw new LedgerError(`unknown psp status ${status}`);
  }

  placeBet(playerId: string, roundId: string, stakeCents: number): Round {
    if (stakeCents <= 0) throw new LedgerError("stake must be positive");
    const existing = this.rounds.get(roundId);
    if (existing) {
      if (existing.playerId !== playerId || existing.stakeCents !== stakeCents) {
        throw new LedgerError("round_id already used with a different intent");
      }
      return existing;
    }
    try {
      assertBetGates(playerId, this.stateOf(playerId).status);
    } catch (e) {
      if (e instanceof GateBlocked) {
        this.record({
          action: "bet",
          playerId,
          result: "deny",
          gate: e.gate,
          message: e.message,
        });
      }
      throw e;
    }
    this.record({
      action: "bet",
      playerId,
      result: "allow",
      gate: "PASS",
      message: "entry gates passed; stake still needs cash",
    });
    const available = this.ledger.signedBalance(cashAcct(playerId));
    if (stakeCents > available) {
      throw new InsufficientFunds(`need ${stakeCents} have ${available}`);
    }
    this.ledger.post({
      debit: cashAcct(playerId),
      credit: inPlayAcct(playerId),
      amountCents: stakeCents,
      idempotencyKey: `bet:${roundId}`,
      event: "bet",
    });
    const rnd: Round = {
      roundId,
      playerId,
      stakeCents,
      status: "open",
      payoutCents: null,
    };
    this.rounds.set(roundId, rnd);
    return rnd;
  }

  settle(roundId: string, payoutCents: number): Round {
    if (payoutCents < 0) throw new LedgerError("payout cannot be negative");
    const rnd = this.rounds.get(roundId);
    if (!rnd) throw new LedgerError(`unknown round_id ${roundId}`);
    if (rnd.status === "settled") return rnd;

    const cash = cashAcct(rnd.playerId);
    const hold = inPlayAcct(rnd.playerId);
    const stake = rnd.stakeCents;

    if (payoutCents === 0) {
      this.ledger.post({
        debit: hold,
        credit: HOUSE,
        amountCents: stake,
        idempotencyKey: `settle:${roundId}`,
        event: "settle_lose",
      });
    } else if (payoutCents === stake) {
      this.ledger.post({
        debit: hold,
        credit: cash,
        amountCents: stake,
        idempotencyKey: `settle:${roundId}`,
        event: "settle_void",
      });
    } else if (payoutCents > stake) {
      this.ledger.post({
        debit: hold,
        credit: cash,
        amountCents: stake,
        idempotencyKey: `settle:${roundId}`,
        event: "settle_return_stake",
      });
      this.ledger.post({
        debit: HOUSE,
        credit: cash,
        amountCents: payoutCents - stake,
        idempotencyKey: `settle_win:${roundId}`,
        event: "settle_win",
      });
    } else {
      this.ledger.post({
        debit: hold,
        credit: cash,
        amountCents: payoutCents,
        idempotencyKey: `settle:${roundId}`,
        event: "settle_partial_return",
      });
      this.ledger.post({
        debit: hold,
        credit: HOUSE,
        amountCents: stake - payoutCents,
        idempotencyKey: `settle_house:${roundId}`,
        event: "settle_partial_house",
      });
    }

    rnd.status = "settled";
    rnd.payoutCents = payoutCents;
    return rnd;
  }

  requestWithdraw(playerId: string, amountCents: number, withdrawId: string): Withdrawal {
    if (amountCents <= 0) throw new LedgerError("amount must be positive");
    const existing = this.withdrawals.get(withdrawId);
    if (existing) return existing;
    const st = this.stateOf(playerId);
    try {
      assertWithdrawGates({
        playerId,
        status: st.status,
        kycVerified: st.kycVerified,
        amountCents,
      });
    } catch (e) {
      if (e instanceof GateBlocked) {
        this.record({
          action: "withdraw",
          playerId,
          result: "deny",
          gate: e.gate,
          message: e.message,
        });
      }
      throw e;
    }
    const available = this.ledger.signedBalance(cashAcct(playerId));
    if (amountCents > available) {
      throw new InsufficientFunds(`need ${amountCents} have ${available}`);
    }
    this.record({
      action: "withdraw",
      playerId,
      result: "allow",
      gate: "PASS",
      message: "thick withdraw gates passed; cash held until payout_sent",
    });
    this.ledger.post({
      debit: cashAcct(playerId),
      credit: withdrawAcct(playerId),
      amountCents,
      idempotencyKey: `withdraw:${withdrawId}`,
      event: "withdraw_hold",
    });
    const w: Withdrawal = {
      withdrawId,
      playerId,
      amountCents,
      status: "pending",
      pspTransactionId: null,
    };
    this.withdrawals.set(withdrawId, w);
    return w;
  }

  onPayoutWebhook(withdrawId: string, status: string, pspTransactionId: string): Withdrawal {
    const w = this.withdrawals.get(withdrawId);
    if (!w) throw new LedgerError(`unknown withdraw_id ${withdrawId}`);

    const mapped = this.pspTxnToWithdraw.get(pspTransactionId);
    if (mapped && mapped !== withdrawId) {
      throw new LedgerError("psp_transaction_id already bound to another withdraw");
    }

    if (w.status === "sent" || w.status === "failed") return w;

    const hold = withdrawAcct(w.playerId);
    if (status === "payout_sent") {
      const applied = this.ledger.post({
        debit: hold,
        credit: "cash_at_psp",
        amountCents: w.amountCents,
        idempotencyKey: `payout:${withdrawId}`,
        event: "payout_sent",
      });
      if (applied) {
        w.status = "sent";
        w.pspTransactionId = pspTransactionId;
        this.pspTxnToWithdraw.set(pspTransactionId, withdrawId);
      }
      return w;
    }

    if (status === "failed") {
      this.ledger.post({
        debit: hold,
        credit: cashAcct(w.playerId),
        amountCents: w.amountCents,
        idempotencyKey: `payout_fail:${withdrawId}`,
        event: "payout_failed",
      });
      w.status = "failed";
      w.pspTransactionId = pspTransactionId;
      return w;
    }

    throw new LedgerError(`unknown payout status ${status}`);
  }

  cashier(playerId: string): CashierView {
    const last = [...this.deposits.values()].filter((d) => d.playerId === playerId).at(-1);
    return {
      availableCents: this.ledger.signedBalance(cashAcct(playerId)),
      inPlayCents: this.ledger.signedBalance(inPlayAcct(playerId)),
      withdrawPendingCents: this.ledger.signedBalance(withdrawAcct(playerId)),
      lastDepositStatus: last?.status ?? null,
    };
  }

  private playerView(playerId: string): PlayerView {
    const st = this.stateOf(playerId);
    const used = this.usedDepositCents(playerId);
    return {
      ...st,
      usedDepositCents: used,
      remainingDepositCents: Math.max(0, st.dailyLimitCents - used),
      kycOnDeposit: false,
    };
  }

  snapshot(): DeskSnapshot {
    const cashiers: Record<string, CashierView> = {};
    const players: Record<string, PlayerView> = {};
    for (const id of PLAYERS) {
      cashiers[id] = this.cashier(id);
      players[id] = this.playerView(id);
    }
    return {
      booksOk: this.ledger.booksBalance(),
      cashAtPspCents: this.ledger.signedBalance("cash_at_psp"),
      houseCents: this.ledger.signedBalance(HOUSE),
      cashiers,
      players,
      deposits: [...this.deposits.values()],
      withdrawals: [...this.withdrawals.values()],
      kycCases: [...this.kycCases.values()],
      rounds: [...this.rounds.values()],
      postings: [...this.ledger.postings],
      gateLog: [...this.gateLog],
    };
  }
}
