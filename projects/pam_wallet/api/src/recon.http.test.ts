import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { INestApplication } from "@nestjs/common";
import { createPamApp } from "./app";
import type { DeskSnapshot } from "./pam";

type HttpJson = { status: number; data: DeskSnapshot & { error?: string; gate?: string } };

describe("recon HTTP", () => {
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

  async function post(path: string, body: Record<string, unknown> = {}): Promise<HttpJson> {
    const res = await fetch(`${base}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return { status: res.status, data: (await res.json()) as HttpJson["data"] };
  }

  it("plant fee → break → reject adjust → named fee clears", async () => {
    assert.equal((await post("/api/reset")).status, 201);
    await post("/api/deposits", { playerId: "p_1", amountCents: 5000, depositId: "dep_1" });
    await post("/api/psp-webhook", {
      depositId: "dep_1",
      status: "captured",
      pspTransactionId: "psp_aaa",
    });

    const clean = await post("/api/recon");
    assert.equal(clean.status, 201);
    assert.equal(clean.data.recon?.clean, true);

    const planted = await post("/api/recon/plant/fee");
    assert.equal(planted.data.recon, null);
    assert.equal(planted.data.booksOk, true);

    const broken = await post("/api/recon");
    assert.equal(broken.data.recon?.clean, false);
    assert.equal(broken.data.recon?.breaks[0]?.amountCents, 1);

    const adjust = await post("/api/recon/fix/adjust");
    assert.equal(adjust.status, 403);
    assert.equal(adjust.data.gate, "RECON_ADJUST");

    const fixed = await post("/api/recon/fix/fee");
    assert.equal(fixed.status, 201);
    const again = await post("/api/recon");
    assert.equal(again.data.recon?.clean, true);
  });
});
