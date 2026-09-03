import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { Exam } from "./Exam";
import type { QuizPaper, QuizResult } from "./api";

const paper: QuizPaper = {
  title: "PAM · recon",
  minutes: 12,
  questions: [
    {
      id: "r1",
      lecture: 1,
      kind: "choice",
      prompt: "balanced = recon з PSP?",
      options: ["Так", "Ні, balanced — лише книга сама з собою"],
    },
  ],
};

beforeEach(() => {
  vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = String(input);
    if (path.includes("/api/quiz/recon") && (init?.method ?? "GET") === "GET") {
      return new Response(JSON.stringify(paper), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (path.includes("/api/quiz/recon/grade")) {
      const body = JSON.parse(String(init?.body ?? "{}")) as {
        answers?: { r1?: { choice?: string } };
      };
      const ok = body.answers?.r1?.choice === "Ні, balanced — лише книга сама з собою";
      const result: QuizResult = {
        total: 1,
        correct: ok ? 1 : 0,
        items: [{ id: "r1", ok, explanation: "Identity ≠ PSP." }],
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

test("recon exam submits to PAM grade", async () => {
  const user = userEvent.setup();
  render(<Exam pack="recon" />);
  await screen.findByText("balanced = recon з PSP?");
  await user.click(screen.getByLabelText("Ні, balanced — лише книга сама з собою"));
  await user.click(screen.getByTestId("exam-submit"));
  await waitFor(() => expect(screen.getByTestId("exam-score")).toHaveTextContent("1 / 1"));
});
