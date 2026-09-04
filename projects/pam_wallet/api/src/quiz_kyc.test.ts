import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkKycQuestion, fixturePerfectKyc, gradeKycQuiz, publicKycQuiz } from "./quiz_kyc";

describe("quiz kyc", () => {
  it("GET paper has no answers", () => {
    const paper = publicKycQuiz();
    const blob = JSON.stringify(paper);
    assert.equal(paper.questions.length, 8);
    assert.equal(blob.includes("explanation"), false);
  });

  it("perfect paper scores 8", () => {
    const r = gradeKycQuiz(fixturePerfectKyc());
    assert.equal(r.correct, 8);
    assert.equal(r.total, 8);
  });

  it("check returns hint only when wrong", () => {
    const miss = checkKycQuestion("k2", { choice: "Уже verified; можна виводити" });
    assert.equal(miss.ok, false);
    assert.match(miss.hint ?? "", /Pending/);
    const hit = checkKycQuestion("k2", fixturePerfectKyc().k2);
    assert.equal(hit.ok, true);
    assert.equal(hit.hint, undefined);
  });
});
