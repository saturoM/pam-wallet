import { Body, Controller, Get, Post } from "@nestjs/common";
import { pamService } from "./pam.service";

@Controller()
export class DeskController {
  @Get("desk")
  desk() {
    return pamService.snapshot();
  }

  @Post("reset")
  reset() {
    return pamService.reset();
  }

  @Post("deposits")
  deposit(
    @Body() body: { playerId: string; amountCents: number; depositId: string },
  ) {
    return pamService.requestDeposit(body.playerId, body.amountCents, body.depositId);
  }

  @Post("psp-webhook")
  webhook(
    @Body() body: { depositId: string; status: string; pspTransactionId: string },
  ) {
    return pamService.pspWebhook(body.depositId, body.status, body.pspTransactionId);
  }

  @Post("bets")
  bet(@Body() body: { playerId: string; roundId: string; stakeCents: number }) {
    return pamService.placeBet(body.playerId, body.roundId, body.stakeCents);
  }

  @Post("settle")
  settle(@Body() body: { roundId: string; payoutCents: number }) {
    return pamService.settle(body.roundId, body.payoutCents);
  }

  @Post("player-status")
  playerStatus(@Body() body: { playerId: string; status: "active" | "self_excluded" | "frozen" }) {
    return pamService.setPlayerStatus(body.playerId, body.status);
  }

  @Post("kyc")
  submitKyc(@Body() body: { playerId: string; kycId: string }) {
    return pamService.submitKyc(body.playerId, body.kycId);
  }

  @Post("kyc-review")
  reviewKyc(@Body() body: { kycId: string; status: "approved" | "rejected" }) {
    return pamService.reviewKyc(body.kycId, body.status);
  }

  @Post("withdrawals")
  withdraw(
    @Body() body: { playerId: string; amountCents: number; withdrawId: string },
  ) {
    return pamService.requestWithdraw(body.playerId, body.amountCents, body.withdrawId);
  }

  @Post("payout-webhook")
  payout(
    @Body() body: { withdrawId: string; status: string; pspTransactionId: string },
  ) {
    return pamService.payoutWebhook(body.withdrawId, body.status, body.pspTransactionId);
  }
}
