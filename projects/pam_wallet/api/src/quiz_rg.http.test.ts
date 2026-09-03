import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { INestApplication } from "@nestjs/common";
import { createPamApp } from "./app";
import { fixturePerfectRg } from "./quiz_rg";
import type { QuizPaper, QuizResult } from "./quiz";

describe("quiz rg HTTP", () => {
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

  it("serves rg paper and grades", async () => {
    const paperRes = await fetch(`${base}/api/quiz/rg`);
    const paper = (await paperRes.json()) as QuizPaper;
    assert.equal(paperRes.status, 200);
    assert.equal(paper.questions.length, 8);
    assert.equal(JSON.stringify(paper).includes("explanation"), false);

    const miss = await fetch(`${base}/api/quiz/rg/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "g6", answer: { choice: "Звичайний вивід з кишені" } }),
    });
    const missBody = (await miss.json()) as { ok: boolean; hint?: string };
    assert.equal(missBody.ok, false);
    assert.ok(missBody.hint);

    const hit = await fetch(`${base}/api/quiz/rg/grade`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: fixturePerfectRg() }),
    });
    const perfect = (await hit.json()) as QuizResult;
    assert.equal(perfect.correct, 8);
  });
});
