import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { Drill } from "./Drill";
import type { DrillPaper, QuizResult } from "./api";

const paper: DrillPaper = {
  title: "Spot the slip",
  minutes: 10,
  cards: [
    {
      id: "s1",
      kind: "write",
      title: "S1 · tainted log",
      stimulus: "Змішаний рядок.",
      task: "Який збій?",
    },
  ],
};

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = String(input);
    if (path.endsWith("/api/drill") && (init?.method ?? "GET") === "GET") {
      return new Response(JSON.stringify(paper), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (path.includes("/api/drill/check")) {
      const body = JSON.parse(String(init?.body ?? "{}")) as {
        answer?: { text?: string };
      };
      const ok = (body.answer?.text ?? "").includes("дві");
      return new Response(
        JSON.stringify(ok ? { ok: true } : { ok: false, hint: "Порахуй розвилки." }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      );
    }
    if (path.includes("/api/drill/grade")) {
      const body = JSON.parse(String(init?.body ?? "{}")) as {
        answers?: { s1?: { text?: string } };
      };
      const ok = (body.answers?.s1?.text ?? "").includes("дві");
      const result: QuizResult = {
        total: 1,
        correct: ok ? 1 : 0,
        items: [{ id: "s1", ok, explanation: "Дві розвилки." }],
      };
      return new Response(JSON.stringify(result), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response("{}", { status: 404 });
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});

test("drill submits to PAM grade", async () => {
  const user = userEvent.setup();
  render(<Drill />);
  await screen.findByText("Який збій?");
  await user.type(screen.getByTestId("s1-text"), "дві розвилки депозит і вивід");
  await user.click(screen.getByTestId("drill-submit"));
  await waitFor(() => expect(screen.getByTestId("drill-score")).toHaveTextContent("1 / 1"));
});

test("check shows hint when wrong", async () => {
  const user = userEvent.setup();
  render(<Drill />);
  await screen.findByText("Який збій?");
  await user.type(screen.getByTestId("s1-text"), "все добре");
  await user.click(screen.getByTestId("check-s1"));
  await waitFor(() => expect(screen.getByTestId("hint-s1")).toHaveTextContent(/розвил/));
});
