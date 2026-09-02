import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { INestApplication } from "@nestjs/common";
import { createPamApp } from "./app";
import type { DeskSnapshot } from "./pam";

type HttpJson = { status: number; data: DeskSnapshot & { error?: string; gate?: string } };

describe("desk HTTP walk", () => {
  let app: INestApplication;
  let base = "";

  before(async () => {
    app = await createPamApp({ logger: false });
    await app.listen(0, "127.0.0.1");
    const addr = app.getHttpServer().address();
    if (!addr || typeof addr === "string") throw new Error("no listen address");
    base = `http://127.0.0.1:${addr.port}`;
  });

  after(async () => {
    await app.close();
  });

  async function get(path: string): Promise<HttpJson> {
    const res = await fetch(`${base}${path}`);
    return { status: res.status, data: (await res.json()) as HttpJson["data"] };
  }

  async function post(path: string, body: Record<string, unknown>): Promise<HttpJson> {
    const res = await fetch(`${base}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return { status: res.status, data: (await res.json()) as HttpJson["data"] };
  }

  it("interview walk: deposit → capture → kyc → withdraw → payout", async () => {
    assert.equal((await post("/api/reset", {})).status, 201);

    const pending = await post("/api/deposits", {
      playerId: "p_1",
      amountCents: 5000,
      depositId: "dep_1",
    });
    assert.equal(pending.status, 201);
    assert.equal(pending.data.cashiers.p_1.availableCents, 0);
    assert.equal(pending.data.deposits[0]?.status, "pending");
    assert.equal(pending.data.postings.length, 0);

    const captured = await post("/api/psp-webhook", {
      depositId: "dep_1",
      status: "captured",
      pspTransactionId: "psp_aaa",
    });
    assert.equal(captured.data.cashiers.p_1.availableCents, 5000);

    const noKyc = await post("/api/withdrawals", {
      playerId: "p_1",
      amountCents: 2000,
      withdrawId: "wd_1",
    });
    assert.equal(noKyc.status, 403);
    assert.equal(noKyc.data.gate, "KYC_REQUIRED");

    const submitted = await post("/api/kyc", { playerId: "p_1", kycId: "kyc_1" });
    assert.equal(submitted.status, 201);
    assert.equal(submitted.data.players.p_1.kycVerified, false);
    assert.equal(submitted.data.players.p_1.kycStatus, "pending");
    assert.equal(submitted.data.kycCases[0]?.status, "pending");

    const stillBlocked = await post("/api/withdrawals", {
      playerId: "p_1",
      amountCents: 2000,
      withdrawId: "wd_1",
    });
    assert.equal(stillBlocked.status, 403);

    const approved = await post("/api/kyc-review", { kycId: "kyc_1", status: "approved" });
    assert.equal(approved.data.players.p_1.kycVerified, true);

    const held = await post("/api/withdrawals", {
      playerId: "p_1",
      amountCents: 2000,
      withdrawId: "wd_1",
    });
    assert.equal(held.data.cashiers.p_1.availableCents, 3000);
    assert.equal(held.data.cashiers.p_1.withdrawPendingCents, 2000);

    const paid = await post("/api/payout-webhook", {
      withdrawId: "wd_1",
      status: "payout_sent",
      pspTransactionId: "pay_1",
    });
    assert.equal(paid.data.cashiers.p_1.withdrawPendingCents, 0);
    assert.equal(paid.data.cashAtPspCents, 3000);
    assert.equal(paid.data.booksOk, true);

    const replay = await post("/api/psp-webhook", {
      depositId: "dep_1",
      status: "captured",
      pspTransactionId: "psp_aaa",
    });
    assert.equal(replay.data.cashiers.p_1.availableCents, 3000);

    const tiny = await post("/api/deposits", {
      playerId: "p_1",
      amountCents: 500,
      depositId: "dep_tiny",
    });
    assert.equal(tiny.status, 403);
    assert.equal(tiny.data.gate, "AMOUNT_MIN");

    const desk = await get("/api/desk");
    assert.equal(desk.status, 200);
    assert.equal(desk.data.kycCases[0]?.status, "approved");
  });
});
