import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { Exam } from "./Exam";
import type { QuizPaper, QuizResult } from "./api";

const paper: QuizPaper = {
  title: "PAM · RG",
  minutes: 12,
  questions: [
    {
      id: "g6",
      lecture: 1,
      kind: "choice",
      prompt: "PSP списав, PAM кишеню не кредитить. Що з грошима?",
      options: ["Звичайний вивід з кишені", "Потрібен refund у PSP (можна пачкою); не withdraw з каси"],
    },
  ],
};

beforeEach(() => {
  vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = String(input);
    if (path.includes("/api/quiz/rg") && (init?.method ?? "GET") === "GET") {
      return new Response(JSON.stringify(paper), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (path.includes("/api/quiz/rg/grade")) {
      const body = JSON.parse(String(init?.body ?? "{}")) as {
        answers?: { g6?: { choice?: string } };
      };
      const ok =
        body.answers?.g6?.choice ===
        "Потрібен refund у PSP (можна пачкою); не withdraw з каси";
      const result: QuizResult = {
        total: 1,
        correct: ok ? 1 : 0,
        items: [{ id: "g6", ok, explanation: "Кишені немає." }],
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

test("rg exam submits to PAM grade", async () => {
  const user = userEvent.setup();
  render(<Exam pack="rg" />);
  await screen.findByText("PSP списав, PAM кишеню не кредитить. Що з грошима?");
  await user.click(
    screen.getByLabelText("Потрібен refund у PSP (можна пачкою); не withdraw з каси"),
  );
  await user.click(screen.getByTestId("exam-submit"));
  await waitFor(() => expect(screen.getByTestId("exam-score")).toHaveTextContent("1 / 1"));
});
