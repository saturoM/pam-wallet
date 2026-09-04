import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkPspQuestion, fixturePerfectPsp, gradePspQuiz, publicPspQuiz } from "./quiz_psp";

describe("quiz psp", () => {
  it("GET paper has no answers", () => {
    const paper = publicPspQuiz();
    const blob = JSON.stringify(paper);
    assert.equal(paper.questions.length, 8);
    assert.equal(blob.includes("explanation"), false);
  });

  it("perfect paper scores 8", () => {
    const r = gradePspQuiz(fixturePerfectPsp());
    assert.equal(r.correct, 8);
    assert.equal(r.total, 8);
  });

  it("check returns hint only when wrong", () => {
    const miss = checkPspQuestion("p1", { choice: "Так — банк уже підтвердив людину" });
    assert.equal(miss.ok, false);
    assert.match(miss.hint ?? "", /3DS/);
    const hit = checkPspQuestion("p1", fixturePerfectPsp().p1);
    assert.equal(hit.ok, true);
    assert.equal(hit.hint, undefined);
  });
});
