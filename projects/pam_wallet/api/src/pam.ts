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
import {
  emptyTotals,
  runRecon,
  sumPsp,
  type MoneyKind,
  type PspLine,
  type ReconReport,
  type ReconTotals,
} from "./recon";

export type { PspLine, ReconReport } from "./recon";

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
  pspFile: PspLine[];
  recon: ReconReport | null;
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
  private readonly pspFile: PspLine[] = [];
  private lastRecon: ReconReport | null = null;
  private betHttp = 0;

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
      // RG: if the player is self-excluded at webhook time, we do not credit the wallet.
      // Deposit becomes failed from PAM's perspective so daily room is released.
      // (Refund / card reversal is handled by PSP out-of-band in this simplified model.)
      if (this.stateOf(dep.playerId).status === "self_excluded") {
        dep.status = "failed";
        this.lastRecon = null;
        return dep;
      }

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
        this.addPspLine("captured", dep.amountCents, depositId);
        this.lastRecon = null;
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
      this.betHttp += 1;
      this.lastRecon = null;
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
    this.betHttp += 1;
    this.lastRecon = null;
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
        this.addPspLine("payout", w.amountCents, withdrawId);
        this.lastRecon = null;
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
      pspFile: [...this.pspFile],
      recon: this.lastRecon,
    };
  }

  private addPspLine(kind: MoneyKind, amountCents: number, ref: string): boolean {
    if (this.pspFile.some((l) => l.kind === kind && l.ref === ref)) return false;
    this.pspFile.push({ kind, amountCents, ref });
    return true;
  }

  private pamMoney(): ReconTotals {
    const t = emptyTotals();
    const eventToKind: Record<string, MoneyKind> = {
      deposit_captured: "captured",
      payout_sent: "payout",
      psp_fee: "fee",
      chargeback: "chargeback",
    };
    for (const p of this.ledger.postings) {
      const kind = eventToKind[p.event];
      if (kind) t[kind] += p.amountCents;
    }
    return t;
  }

  runRecon(): ReconReport {
    this.lastRecon = runRecon({
      booksOk: this.ledger.booksBalance(),
      pam: this.pamMoney(),
      psp: sumPsp(this.pspFile),
      betHttp: this.betHttp,
      betRows: this.rounds.size,
    });
    return this.lastRecon;
  }

  /** PSP file only. Books stay balanced. Lecture $0.01. */
  plantPspFee(): PspLine {
    const captured = [...this.deposits.values()].find((d) => d.status === "captured");
    if (!captured) throw new LedgerError("need a captured deposit before planting a PSP fee");
    if (!this.addPspLine("fee", 1, "psp_fee")) throw new LedgerError("PSP fee already on the file");
    this.lastRecon = null;
    return this.pspFile.at(-1)!;
  }

  /** PSP file only. PAM still thinks cash_at_psp holds the deposit. */
  plantPspChargeback(): PspLine {
    const captured = [...this.deposits.values()].reverse().find((d) => d.status === "captured");
    if (!captured) throw new LedgerError("need a captured deposit before planting a chargeback");
    if (!this.addPspLine("chargeback", captured.amountCents, captured.depositId)) {
      throw new LedgerError("PSP already has that chargeback");
    }
    this.lastRecon = null;
    return this.pspFile.at(-1)!;
  }

  /** PSP captured, PAM still pending — lost webhook. */
  plantGhostCapture(): PspLine {
    const pending = [...this.deposits.values()].reverse().find((d) => d.status === "pending");
    if (!pending) throw new LedgerError("need a pending deposit to plant a ghost capture");
    if (!this.addPspLine("captured", pending.amountCents, pending.depositId)) {
      throw new LedgerError("PSP already has that capture");
    }
    this.lastRecon = null;
    return this.pspFile.at(-1)!;
  }

  /** Named fee. Not recon_adjust. */
  postPspFee(): void {
    if (!this.pspFile.some((l) => l.kind === "fee" && l.ref === "psp_fee")) {
      throw new LedgerError("no PSP fee on the file to name");
    }
    const applied = this.ledger.post({
      debit: HOUSE,
      credit: "cash_at_psp",
      amountCents: 1,
      idempotencyKey: "fee:psp_fee",
      event: "psp_fee",
    });
    if (!applied) return;
    this.lastRecon = null;
  }

  /** Named chargeback. Takes player cash if still there, else house eats it. */
  postChargeback(): void {
    const line = [...this.pspFile].reverse().find((l) => l.kind === "chargeback");
    if (!line) throw new LedgerError("no PSP chargeback on the file to name");
    const dep = this.deposits.get(line.ref);
    if (!dep) throw new LedgerError(`unknown deposit_id ${line.ref}`);
    const available = this.ledger.signedBalance(cashAcct(dep.playerId));
    const debit = available >= line.amountCents ? cashAcct(dep.playerId) : HOUSE;
    const applied = this.ledger.post({
      debit,
      credit: "cash_at_psp",
      amountCents: line.amountCents,
      idempotencyKey: `chargeback:${line.ref}`,
      event: "chargeback",
    });
    if (!applied) return;
    this.lastRecon = null;
  }

  reconAdjust(): never {
    throw new GateBlocked("RECON_ADJUST", "Break is not a posting. No recon_adjust.");
  }
}
