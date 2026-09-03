import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { emptyDesk, type DeskSnapshot } from "./api";
import { App } from "./App";

let snap: DeskSnapshot;

beforeEach(() => {
  snap = structuredClone(emptyDesk);
  vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = String(input).replace(/^https?:\/\/[^/]+/, "");
    const method = init?.method ?? "GET";
    if (path.endsWith("/api/desk") && method === "GET") {
      return new Response(JSON.stringify(snap), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    if (path.endsWith("/api/recon")) {
      snap.recon = {
        booksOk: true,
        clean: false,
        pam: { captured: 5000, payout: 0, fee: 0, chargeback: 0 },
        psp: { captured: 5000, payout: 0, fee: 1, chargeback: 0 },
        breaks: [{ kind: "fee", pamCents: 0, pspCents: 1, amountCents: 1 }],
        notBreaks: [],
      };
      return new Response(JSON.stringify(snap), { status: 201, headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify(snap), { status: 201, headers: { "Content-Type": "application/json" } });
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test("run recon shows a $0.01 fee break", async () => {
  const user = userEvent.setup();
  render(<App />);
  await waitFor(() => expect(screen.getByTestId("run-recon")).toBeEnabled());
  await user.click(screen.getByTestId("run-recon"));
  await waitFor(() => expect(screen.getByTestId("recon-result")).toHaveTextContent("$0.01"));
});

test("walk hint stays closed until opened", async () => {
  const user = userEvent.setup();
  render(<App />);
  const hint = await screen.findByTestId("recon-walk-hint");
  expect(hint).not.toHaveAttribute("open");
  await user.click(screen.getByText("Walk hint"));
  expect(hint).toHaveAttribute("open");
  expect(hint).toHaveTextContent("A · $0.01 fee");
});
