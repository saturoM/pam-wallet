import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emptyTotals, runRecon } from "./recon";
import { GateBlocked } from "./ledger";
import { Pam } from "./pam";

function funded(): Pam {
  const pam = new Pam();
  pam.requestDeposit("p_1", 5000, "dep_1");
  pam.onPspWebhook("dep_1", "captured", "psp_aaa");
  return pam;
}

describe("recon compute", () => {
  it("fee $0.01 is a break; replay HTTP is not", () => {
    const r = runRecon({
      booksOk: true,
      pam: { ...emptyTotals(), captured: 5000 },
      psp: { ...emptyTotals(), captured: 5000, fee: 1 },
      betHttp: 2,
      betRows: 1,
    });
    assert.equal(r.clean, false);
    assert.equal(r.breaks[0]?.kind, "fee");
    assert.equal(r.breaks[0]?.amountCents, 1);
    assert.equal(r.notBreaks[0]?.id, "bet_replay");
  });
});

describe("recon desk", () => {
  it("capture is clean; PSP fee $0.01 breaks; named fee closes it", () => {
    const pam = funded();
    assert.equal(pam.runRecon().clean, true);
    pam.plantPspFee();
    const broken = pam.runRecon();
    assert.equal(broken.clean, false);
    assert.equal(broken.breaks[0]?.amountCents, 1);
    assert.equal(pam.ledger.booksBalance(), true);
    assert.throws(() => pam.reconAdjust(), GateBlocked);
    pam.postPspFee();
    assert.equal(pam.runRecon().clean, true);
    assert.equal(pam.ledger.postings.some((p) => p.idempotencyKey === "fee:psp_fee"), true);
  });

  it("ghost capture is a captured break; webhook closes it", () => {
    const pam = new Pam();
    pam.requestDeposit("p_1", 5000, "dep_1");
    pam.plantGhostCapture();
    const broken = pam.runRecon();
    assert.equal(broken.breaks[0]?.kind, "captured");
    assert.equal(broken.breaks[0]?.amountCents, 5000);
    assert.equal(pam.cashier("p_1").availableCents, 0);
    pam.onPspWebhook("dep_1", "captured", "psp_aaa");
    assert.equal(pam.runRecon().clean, true);
    assert.equal(pam.ledger.postings.length, 1);
  });

  it("retry bet is not a PSP break", () => {
    const pam = funded();
    pam.placeBet("p_1", "rnd_1", 1000);
    pam.placeBet("p_1", "rnd_1", 1000);
    const r = pam.runRecon();
    assert.equal(r.clean, true);
    assert.equal(r.notBreaks[0]?.id, "bet_replay");
  });
});
