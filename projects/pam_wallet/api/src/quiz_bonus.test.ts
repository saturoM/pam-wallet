import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  checkBonusQuestion,
  fixturePerfectBonus,
  gradeBonusQuiz,
  publicBonusQuiz,
} from "./quiz_bonus";

describe("quiz bonus", () => {
  it("GET paper has no answers", () => {
    const paper = publicBonusQuiz();
    const blob = JSON.stringify(paper);
    assert.equal(paper.questions.length, 8);
    assert.equal(blob.includes("explanation"), false);
  });

  it("perfect paper scores 8", () => {
    const r = gradeBonusQuiz(fixturePerfectBonus());
    assert.equal(r.correct, 8);
    assert.equal(r.total, 8);
  });

  it("check returns hint only when wrong", () => {
    const miss = checkBonusQuestion("b1", {
      choice: "Одне поле balance=150 і нотатка «50 бонус»",
    });
    assert.equal(miss.ok, false);
    assert.match(miss.hint ?? "", /баланс/);
    const hit = checkBonusQuestion("b1", fixturePerfectBonus().b1);
    assert.equal(hit.ok, true);
    assert.equal(hit.hint, undefined);
  });
});
