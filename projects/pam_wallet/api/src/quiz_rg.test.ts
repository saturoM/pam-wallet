import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkRgQuestion, fixturePerfectRg, gradeRgQuiz, publicRgQuiz } from "./quiz_rg";

describe("quiz rg", () => {
  it("GET paper has no answers", () => {
    const paper = publicRgQuiz();
    const blob = JSON.stringify(paper);
    assert.equal(paper.questions.length, 8);
    assert.equal(blob.includes("explanation"), false);
  });

  it("perfect paper scores 8", () => {
    const r = gradeRgQuiz(fixturePerfectRg());
    assert.equal(r.correct, 8);
    assert.equal(r.total, 8);
  });

  it("check returns hint only when wrong", () => {
    const miss = checkRgQuestion("g6", { choice: "Звичайний вивід з кишені" });
    assert.equal(miss.ok, false);
    assert.match(miss.hint ?? "", /PSP/);
    const hit = checkRgQuestion("g6", fixturePerfectRg().g6);
    assert.equal(hit.ok, true);
    assert.equal(hit.hint, undefined);
  });
});
