import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { Exam } from "./Exam";
import type { QuizPaper, QuizResult } from "./api";

const paper: QuizPaper = {
  title: "PAM · KYC / AML",
  minutes: 12,
  questions: [
    {
      id: "k2",
      lecture: 1,
      kind: "choice",
      prompt: "Submit KYC що означає?",
      options: [
        "Уже verified; можна виводити",
        "Заявка pending; verified ще немає; вивід ні",
      ],
    },
  ],
};

beforeEach(() => {
  vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = String(input);
    if (path.includes("/api/quiz/kyc") && (init?.method ?? "GET") === "GET") {
      return new Response(JSON.stringify(paper), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (path.includes("/api/quiz/kyc/grade")) {
      const body = JSON.parse(String(init?.body ?? "{}")) as {
        answers?: { k2?: { choice?: string } };
      };
      const ok =
        body.answers?.k2?.choice === "Заявка pending; verified ще немає; вивід ні";
      const result: QuizResult = {
        total: 1,
        correct: ok ? 1 : 0,
        items: [{ id: "k2", ok, explanation: "Pending ≠ verified." }],
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

test("kyc exam submits to PAM grade", async () => {
  const user = userEvent.setup();
  render(<Exam pack="kyc" />);
  await screen.findByText("Submit KYC що означає?");
  await user.click(screen.getByLabelText("Заявка pending; verified ще немає; вивід ні"));
  await user.click(screen.getByTestId("exam-submit"));
  await waitFor(() => expect(screen.getByTestId("exam-score")).toHaveTextContent("1 / 1"));
});
