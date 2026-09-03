import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { INestApplication } from "@nestjs/common";
import { createPamApp } from "./app";
import { fixturePerfectDrill, type DrillPaper, type DrillResult } from "./drill";

describe("drill HTTP", () => {
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

  it("serves paper and grades", async () => {
    const paperRes = await fetch(`${base}/api/drill`);
    const paper = (await paperRes.json()) as DrillPaper;
    assert.equal(paperRes.status, 200);
    assert.equal(paper.cards.length, 8);
    assert.equal(JSON.stringify(paper).includes("explanation"), false);

    const empty = await fetch(`${base}/api/drill/grade`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: {} }),
    });
    const zero = (await empty.json()) as DrillResult;
    assert.equal(empty.status, 201);
    assert.equal(zero.correct, 0);

    const miss = await fetch(`${base}/api/drill/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "s1", answer: { text: "ок" } }),
    });
    const missBody = (await miss.json()) as { ok: boolean; hint?: string };
    assert.equal(missBody.ok, false);
    assert.ok(missBody.hint);

    const hit = await fetch(`${base}/api/drill/grade`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: fixturePerfectDrill() }),
    });
    const perfect = (await hit.json()) as DrillResult;
    assert.equal(perfect.correct, 8);
  });
});
