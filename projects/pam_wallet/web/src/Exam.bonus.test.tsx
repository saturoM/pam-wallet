import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { Exam } from "./Exam";
import type { QuizPaper, QuizResult } from "./api";

const paper: QuizPaper = {
  title: "PAM · Bonus / wagering",
  minutes: 12,
  questions: [
    {
      id: "b1",
      lecture: 1,
      kind: "choice",
      prompt: "Cash $100 + bonus $50. Як тримати в PAM?",
      options: [
        "Одне поле balance=150 і нотатка «50 бонус»",
        "Дві кишені: player_cash і bonus; вивід читає withdrawable",
      ],
    },
  ],
};

beforeEach(() => {
  vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = String(input);
    if (path.includes("/api/quiz/bonus") && (init?.method ?? "GET") === "GET") {
      return new Response(JSON.stringify(paper), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (path.includes("/api/quiz/bonus/grade")) {
      const body = JSON.parse(String(init?.body ?? "{}")) as {
        answers?: { b1?: { choice?: string } };
      };
      const ok =
        body.answers?.b1?.choice ===
        "Дві кишені: player_cash і bonus; вивід читає withdrawable";
      const result: QuizResult = {
        total: 1,
        correct: ok ? 1 : 0,
        items: [{ id: "b1", ok, explanation: "Ring-fence." }],
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

test("bonus exam submits to PAM grade", async () => {
  const user = userEvent.setup();
  render(<Exam pack="bonus" />);
  await screen.findByText("Cash $100 + bonus $50. Як тримати в PAM?");
  await user.click(
    screen.getByLabelText("Дві кишені: player_cash і bonus; вивід читає withdrawable"),
  );
  await user.click(screen.getByTestId("exam-submit"));
  await waitFor(() => expect(screen.getByTestId("exam-score")).toHaveTextContent("1 / 1"));
});
