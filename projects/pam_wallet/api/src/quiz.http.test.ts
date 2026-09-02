import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { INestApplication } from "@nestjs/common";
import { createPamApp } from "./app";
import type { QuizPaper, QuizResult } from "./quiz";

describe("quiz HTTP", () => {
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
    const paperRes = await fetch(`${base}/api/quiz`);
    const paper = (await paperRes.json()) as QuizPaper;
    assert.equal(paperRes.status, 200);
    assert.equal(paper.questions.length, 30);
    assert.equal(JSON.stringify(paper).includes("explanation"), false);

    const empty = await fetch(`${base}/api/quiz/grade`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: {} }),
    });
    const zero = (await empty.json()) as QuizResult;
    assert.equal(empty.status, 201);
    assert.equal(zero.correct, 0);

    const q3 = paper.questions.find((q) => q.id === "q3");
    assert.equal(q3?.kind, "posting");

    const miss = await fetch(`${base}/api/quiz/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "q1", answer: { choice: "$50 у player_cash" } }),
    });
    const missBody = (await miss.json()) as { ok: boolean; hint?: string };
    assert.equal(missBody.ok, false);
    assert.ok(missBody.hint);
  });
});
