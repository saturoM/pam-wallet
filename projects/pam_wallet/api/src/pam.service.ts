import { Injectable } from "@nestjs/common";
import { Pam, type DeskSnapshot } from "./pam";
import type { PlayerStatus } from "./gates";

@Injectable()
export class PamService {
  private pam = new Pam();

  snapshot(): DeskSnapshot {
    return this.pam.snapshot();
  }

  reset(): DeskSnapshot {
    this.pam = new Pam();
    return this.pam.snapshot();
  }

  requestDeposit(playerId: string, amountCents: number, depositId: string): DeskSnapshot {
    this.pam.requestDeposit(playerId, amountCents, depositId);
    return this.pam.snapshot();
  }

  pspWebhook(depositId: string, status: string, pspTransactionId: string): DeskSnapshot {
    this.pam.onPspWebhook(depositId, status, pspTransactionId);
    return this.pam.snapshot();
  }

  placeBet(playerId: string, roundId: string, stakeCents: number): DeskSnapshot {
    this.pam.placeBet(playerId, roundId, stakeCents);
    return this.pam.snapshot();
  }

  settle(roundId: string, payoutCents: number): DeskSnapshot {
    this.pam.settle(roundId, payoutCents);
    return this.pam.snapshot();
  }

  setPlayerStatus(playerId: string, status: PlayerStatus): DeskSnapshot {
    this.pam.setPlayerStatus(playerId, status);
    return this.pam.snapshot();
  }

  submitKyc(playerId: string, kycId: string): DeskSnapshot {
    this.pam.submitKyc(playerId, kycId);
    return this.pam.snapshot();
  }

  reviewKyc(kycId: string, status: "approved" | "rejected"): DeskSnapshot {
    this.pam.reviewKyc(kycId, status);
    return this.pam.snapshot();
  }

  requestWithdraw(playerId: string, amountCents: number, withdrawId: string): DeskSnapshot {
    this.pam.requestWithdraw(playerId, amountCents, withdrawId);
    return this.pam.snapshot();
  }

  payoutWebhook(withdrawId: string, status: string, pspTransactionId: string): DeskSnapshot {
    this.pam.onPayoutWebhook(withdrawId, status, pspTransactionId);
    return this.pam.snapshot();
  }

  runRecon(): DeskSnapshot {
    this.pam.runRecon();
    return this.pam.snapshot();
  }

  plantPspFee(): DeskSnapshot {
    this.pam.plantPspFee();
    return this.pam.snapshot();
  }

  plantPspChargeback(): DeskSnapshot {
    this.pam.plantPspChargeback();
    return this.pam.snapshot();
  }

  plantGhostCapture(): DeskSnapshot {
    this.pam.plantGhostCapture();
    return this.pam.snapshot();
  }

  postPspFee(): DeskSnapshot {
    this.pam.postPspFee();
    return this.pam.snapshot();
  }

  postChargeback(): DeskSnapshot {
    this.pam.postChargeback();
    return this.pam.snapshot();
  }

  reconAdjust(): never {
    return this.pam.reconAdjust();
  }
}

/** tsx/esbuild does not emit constructor paramtypes — one in-memory book. */
export const pamService = new PamService();
