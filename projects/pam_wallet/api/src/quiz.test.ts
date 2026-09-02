import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkQuestion, gradeQuiz, publicQuiz, fixturePerfectAnswers } from "./quiz";

describe("quiz", () => {
  it("GET paper has no answers", () => {
    const paper = publicQuiz();
    const blob = JSON.stringify(paper);
    assert.equal(paper.questions.length, 30);
    assert.equal(blob.includes("explanation"), false);
  });

  it("perfect paper scores 30", () => {
    const r = gradeQuiz(fixturePerfectAnswers());
    assert.equal(r.correct, 30);
    assert.equal(r.total, 30);
  });

  it("empty credit on captured is wrong", () => {
    const r = gradeQuiz({
      q3: { posting: { debit: "cash_at_psp", credit: "", amount: "50", key: "captured:dep_1" } },
    });
    assert.equal(r.items.find((i) => i.id === "q3")?.ok, false);
  });

  it("accepts account aliases and $ on amount", () => {
    const r = gradeQuiz({
      q3: {
        posting: { debit: "cash at psp", credit: "account_cash", amount: "$50", key: "dep_1" },
      },
    });
    assert.equal(r.items.find((i) => i.id === "q3")?.ok, true);
  });

  it("check returns hint only when wrong", () => {
    const miss = checkQuestion("q1", { choice: "$50 у player_cash" });
    assert.equal(miss.ok, false);
    assert.match(miss.hint ?? "", /TAKE/);
    const hit = checkQuestion("q1", { choice: "$0" });
    assert.equal(hit.ok, true);
    assert.equal(hit.hint, undefined);
  });
});
