import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  checkReconQuestion,
  fixturePerfectRecon,
  gradeReconQuiz,
  publicReconQuiz,
} from "./quiz_recon";

describe("quiz recon", () => {
  it("GET paper has no answers", () => {
    const paper = publicReconQuiz();
    const blob = JSON.stringify(paper);
    assert.equal(paper.questions.length, 8);
    assert.equal(blob.includes("explanation"), false);
  });

  it("perfect paper scores 8", () => {
    const r = gradeReconQuiz(fixturePerfectRecon());
    assert.equal(r.correct, 8);
    assert.equal(r.total, 8);
  });

  it("check returns hint only when wrong", () => {
    const miss = checkReconQuestion("r1", { choice: "Так, зелений касир = день закритий" });
    assert.equal(miss.ok, false);
    assert.match(miss.hint ?? "", /balanced/i);
    const hit = checkReconQuestion("r1", fixturePerfectRecon().r1);
    assert.equal(hit.ok, true);
    assert.equal(hit.hint, undefined);
  });
});
