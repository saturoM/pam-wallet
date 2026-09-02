import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { Exam } from "./Exam";
import type { QuizPaper, QuizResult } from "./api";

const paper: QuizPaper = {
  title: "PAM · test",
  minutes: 20,
  questions: [
    {
      id: "q1",
      lecture: 1,
      kind: "choice",
      prompt: "Доступно після Deposit click?",
      options: ["$0", "$50"],
    },
  ],
};

beforeEach(() => {
  vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = String(input);
    if (path.endsWith("/api/quiz") && (init?.method ?? "GET") === "GET") {
      return new Response(JSON.stringify(paper), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (path.includes("/api/quiz/check")) {
      const body = JSON.parse(String(init?.body ?? "{}")) as {
        answer?: { choice?: string };
      };
      const ok = body.answer?.choice === "$0";
      return new Response(JSON.stringify(ok ? { ok: true } : { ok: false, hint: "TAKE, не FILL" }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (path.includes("/api/quiz/grade")) {
      const body = JSON.parse(String(init?.body ?? "{}")) as {
        answers?: { q1?: { choice?: string } };
      };
      const ok = body.answers?.q1?.choice === "$0";
      const result: QuizResult = {
        total: 1,
        correct: ok ? 1 : 0,
        items: [{ id: "q1", ok, explanation: "Intent ще не гроші." }],
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
});

test("exam submits to PAM grade", async () => {
  const user = userEvent.setup();
  render(<Exam />);
  await screen.findByText("Доступно після Deposit click?");
  await user.click(screen.getByLabelText("$0"));
  await user.click(screen.getByTestId("exam-submit"));
  await waitFor(() => expect(screen.getByTestId("exam-score")).toHaveTextContent("1 / 1"));
});

test("check shows hint when wrong", async () => {
  const user = userEvent.setup();
  render(<Exam />);
  await screen.findByText("Доступно після Deposit click?");
  await user.click(screen.getByLabelText("$50"));
  await user.click(screen.getByTestId("check-q1"));
  await waitFor(() => expect(screen.getByTestId("hint-q1")).toHaveTextContent(/TAKE/));
});

test("crib explains debit credit keys", async () => {
  render(<Exam />);
  await screen.findByText("Доступно після Deposit click?");
  expect(screen.getByText(/Debit = звідки зняли/)).toBeTruthy();
  expect(screen.getByText(/bet:rnd_1/)).toBeTruthy();
});
