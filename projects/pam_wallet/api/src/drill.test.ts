import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkCard, fixturePerfectDrill, gradeDrill, publicDrill } from "./drill";

describe("drill", () => {
  it("GET paper has no answers", () => {
    const paper = publicDrill();
    const blob = JSON.stringify(paper);
    assert.equal(paper.cards.length, 8);
    assert.equal(blob.includes("explanation"), false);
    assert.equal(blob.includes("groups"), false);
  });

  it("perfect paper scores 8", () => {
    const r = gradeDrill(fixturePerfectDrill());
    assert.equal(r.correct, 8);
    assert.equal(r.total, 8);
  });

  it("empty write is wrong", () => {
    const r = gradeDrill({ s1: { text: "" } });
    assert.equal(r.items.find((i) => i.id === "s1")?.ok, false);
  });

  it("check returns hint only when wrong", () => {
    const miss = checkCard("s1", { text: "все ок" });
    assert.equal(miss.ok, false);
    assert.match(miss.hint ?? "", /розвил/i);
    const hit = checkCard("s1", fixturePerfectDrill().s1);
    assert.equal(hit.ok, true);
    assert.equal(hit.hint, undefined);
  });

  it("S6 classify order matters", () => {
    const r = gradeDrill({
      s6: { classify: { c1: "рішення", c2: "факт", c3: "задача", c4: "ніщо" } },
    });
    assert.equal(r.items.find((i) => i.id === "s6")?.ok, false);
  });
});
