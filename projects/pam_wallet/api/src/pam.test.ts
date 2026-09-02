import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GateBlocked, InsufficientFunds } from "./ledger";
import { HOUSE, Pam } from "./pam";

describe("deposit slice", () => {
  it("pending cashier is zero", () => {
    const pam = new Pam();
    pam.requestDeposit("p_1", 5000, "dep_1");
    assert.equal(pam.cashier("p_1").availableCents, 0);
    assert.equal(pam.cashier("p_1").lastDepositStatus, "pending");
    assert.equal(pam.ledger.postings.length, 0);
  });

  it("captured credits once; duplicate webhook is a no-op", () => {
    const pam = new Pam();
    pam.requestDeposit("p_1", 5000, "dep_1");
    pam.onPspWebhook("dep_1", "captured", "psp_aaa");
    pam.onPspWebhook("dep_1", "captured", "psp_aaa");
    assert.equal(pam.cashier("p_1").availableCents, 5000);
    assert.equal(pam.ledger.postings.length, 1);
    assert.equal(pam.ledger.booksBalance(), true);
  });

  it("players do not share cash", () => {
    const pam = new Pam();
    pam.requestDeposit("p_1", 5000, "dep_1");
    pam.requestDeposit("p_2", 3000, "dep_2");
    pam.onPspWebhook("dep_1", "captured", "psp_aaa");
    pam.onPspWebhook("dep_2", "captured", "psp_bbb");
    assert.equal(pam.cashier("p_1").availableCents, 5000);
    assert.equal(pam.cashier("p_2").availableCents, 3000);
  });
});

describe("bet / settle", () => {
  function funded(): Pam {
    const pam = new Pam();
    pam.requestDeposit("p_1", 5000, "dep_1");
    pam.onPspWebhook("dep_1", "captured", "psp_aaa");
    return pam;
  }

  it("bet moves cash to in_play", () => {
    const pam = funded();
    pam.placeBet("p_1", "rnd_1", 1000);
    assert.equal(pam.cashier("p_1").availableCents, 4000);
    assert.equal(pam.cashier("p_1").inPlayCents, 1000);
  });

  it("settle win returns stake plus payout", () => {
    const pam = funded();
    pam.placeBet("p_1", "rnd_1", 1000);
    pam.settle("rnd_1", 2500);
    assert.equal(pam.cashier("p_1").availableCents, 6500);
    assert.equal(pam.ledger.signedBalance(HOUSE), -1500);
    assert.equal(pam.ledger.booksBalance(), true);
  });

  it("insufficient funds does not post", () => {
    const pam = funded();
    const n = pam.ledger.postings.length;
    assert.throws(() => pam.placeBet("p_1", "rnd_1", 6000), InsufficientFunds);
    assert.equal(pam.ledger.postings.length, n);
  });
});

describe("entry gates", () => {
  it("self-exclusion blocks deposit; no pending row", () => {
    const pam = new Pam();
    pam.setPlayerStatus("p_1", "self_excluded");
    assert.throws(() => pam.requestDeposit("p_1", 5000, "dep_1"), GateBlocked);
    assert.equal(pam.snapshot().deposits.length, 0);
    assert.equal(pam.snapshot().gateLog.at(-1)?.gate, "SELF_EXCLUDED");
  });

  it("pending occupies daily RG room", () => {
    const pam = new Pam();
    pam.requestDeposit("p_1", 5000, "dep_1");
    pam.requestDeposit("p_1", 5000, "dep_2");
    assert.throws(() => pam.requestDeposit("p_1", 5000, "dep_3"), GateBlocked);
    assert.equal(pam.usedDepositCents("p_1"), 10000);
  });

  it("failed deposit releases RG room", () => {
    const pam = new Pam();
    pam.requestDeposit("p_1", 5000, "dep_1");
    pam.onPspWebhook("dep_1", "failed", "psp_aaa");
    pam.requestDeposit("p_1", 5000, "dep_2");
    assert.equal(pam.snapshot().deposits.filter((d) => d.status === "pending").length, 1);
  });

  it("amount below min is not a posting", () => {
    const pam = new Pam();
    assert.throws(() => pam.requestDeposit("p_1", 500, "dep_1"), GateBlocked);
    assert.equal(pam.ledger.postings.length, 0);
  });

  it("freeze blocks new bet; settle still allowed", () => {
    const pam = new Pam();
    pam.requestDeposit("p_1", 5000, "dep_1");
    pam.onPspWebhook("dep_1", "captured", "psp_aaa");
    pam.placeBet("p_1", "rnd_1", 1000);
    pam.setPlayerStatus("p_1", "frozen");
    assert.throws(() => pam.placeBet("p_1", "rnd_2", 1000), GateBlocked);
    pam.settle("rnd_1", 0);
    assert.equal(pam.cashier("p_1").inPlayCents, 0);
  });

  it("KYC is not an entry gate", () => {
    const pam = new Pam();
    assert.equal(pam.snapshot().players.p_1.kycOnDeposit, false);
    pam.requestDeposit("p_1", 5000, "dep_1");
    assert.equal(pam.snapshot().deposits[0].status, "pending");
  });
});

describe("withdraw", () => {
  function cash50(): Pam {
    const pam = new Pam();
    pam.requestDeposit("p_1", 5000, "dep_1");
    pam.onPspWebhook("dep_1", "captured", "psp_aaa");
    return pam;
  }

  it("KYC required; no hold posting", () => {
    const pam = cash50();
    assert.throws(() => pam.requestWithdraw("p_1", 2000, "wd_1"), GateBlocked);
    assert.equal(pam.cashier("p_1").availableCents, 5000);
    assert.equal(pam.cashier("p_1").withdrawPendingCents, 0);
  });

  function verify(pam: Pam, playerId = "p_1"): void {
    pam.submitKyc(playerId, `kyc_${playerId}`);
    pam.reviewKyc(`kyc_${playerId}`, "approved");
  }

  it("submit is not verified; no posting", () => {
    const pam = cash50();
    pam.submitKyc("p_1", "kyc_1");
    assert.equal(pam.snapshot().players.p_1.kycVerified, false);
    assert.equal(pam.snapshot().players.p_1.kycStatus, "pending");
    assert.equal(pam.ledger.postings.filter((p) => p.event.startsWith("kyc")).length, 0);
    assert.throws(() => pam.requestWithdraw("p_1", 2000, "wd_1"), GateBlocked);
  });

  it("approve then withdraw; duplicate review is a no-op", () => {
    const pam = cash50();
    pam.submitKyc("p_1", "kyc_1");
    pam.reviewKyc("kyc_1", "approved");
    pam.reviewKyc("kyc_1", "rejected");
    assert.equal(pam.snapshot().players.p_1.kycVerified, true);
    pam.requestWithdraw("p_1", 2000, "wd_1");
    assert.equal(pam.cashier("p_1").withdrawPendingCents, 2000);
  });

  it("reject keeps withdraw blocked; resubmit allowed", () => {
    const pam = cash50();
    pam.submitKyc("p_1", "kyc_1");
    pam.reviewKyc("kyc_1", "rejected");
    assert.throws(() => pam.requestWithdraw("p_1", 2000, "wd_1"), GateBlocked);
    pam.submitKyc("p_1", "kyc_2");
    pam.reviewKyc("kyc_2", "approved");
    pam.requestWithdraw("p_1", 2000, "wd_1");
    assert.equal(pam.cashier("p_1").withdrawPendingCents, 2000);
  });

  it("hold then payout_sent leaves the PSP", () => {
    const pam = cash50();
    verify(pam);
    pam.requestWithdraw("p_1", 2000, "wd_1");
    assert.equal(pam.cashier("p_1").availableCents, 3000);
    assert.equal(pam.cashier("p_1").withdrawPendingCents, 2000);
    pam.onPayoutWebhook("wd_1", "payout_sent", "psp_out");
    pam.onPayoutWebhook("wd_1", "payout_sent", "psp_out");
    assert.equal(pam.cashier("p_1").availableCents, 3000);
    assert.equal(pam.cashier("p_1").withdrawPendingCents, 0);
    assert.equal(pam.ledger.signedBalance("cash_at_psp"), 3000);
    assert.equal(pam.ledger.booksBalance(), true);
  });

  it("payout failed returns cash", () => {
    const pam = cash50();
    verify(pam);
    pam.requestWithdraw("p_1", 2000, "wd_1");
    pam.onPayoutWebhook("wd_1", "failed", "psp_out");
    assert.equal(pam.cashier("p_1").availableCents, 5000);
    assert.equal(pam.cashier("p_1").withdrawPendingCents, 0);
  });

  it("self-excluded can still cash out", () => {
    const pam = cash50();
    verify(pam);
    pam.setPlayerStatus("p_1", "self_excluded");
    pam.requestWithdraw("p_1", 2000, "wd_1");
    assert.equal(pam.cashier("p_1").withdrawPendingCents, 2000);
  });

  it("cannot withdraw in-play", () => {
    const pam = cash50();
    verify(pam);
    pam.placeBet("p_1", "rnd_1", 4000);
    assert.throws(() => pam.requestWithdraw("p_1", 2000, "wd_1"), InsufficientFunds);
  });
});
