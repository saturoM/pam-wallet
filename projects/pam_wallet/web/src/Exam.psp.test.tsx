import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { Exam } from "./Exam";
import type { QuizPaper, QuizResult } from "./api";

const paper: QuizPaper = {
  title: "PAM · PSP routing",
  minutes: 12,
  questions: [
    {
      id: "p1",
      lecture: 1,
      kind: "choice",
      prompt: "3DS пройшов успішно. Кредитити player_cash зараз?",
      options: ["Так — банк уже підтвердив людину", "Ні — чекати PSP captured"],
    },
  ],
};

beforeEach(() => {
  vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = String(input);
    if (path.includes("/api/quiz/psp") && (init?.method ?? "GET") === "GET") {
      return new Response(JSON.stringify(paper), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (path.includes("/api/quiz/psp/grade")) {
      const body = JSON.parse(String(init?.body ?? "{}")) as {
        answers?: { p1?: { choice?: string } };
      };
      const ok = body.answers?.p1?.choice === "Ні — чекати PSP captured";
      const result: QuizResult = {
        total: 1,
        correct: ok ? 1 : 0,
        items: [{ id: "p1", ok, explanation: "3DS ≠ FILL." }],
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

test("psp exam submits to PAM grade", async () => {
  const user = userEvent.setup();
  render(<Exam pack="psp" />);
  await screen.findByText("3DS пройшов успішно. Кредитити player_cash зараз?");
  await user.click(screen.getByLabelText("Ні — чекати PSP captured"));
  await user.click(screen.getByTestId("exam-submit"));
  await waitFor(() => expect(screen.getByTestId("exam-score")).toHaveTextContent("1 / 1"));
});
