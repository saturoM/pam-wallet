import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { emptyDesk, type DeskSnapshot } from "./api";
import { App } from "./App";

let snap: DeskSnapshot;
const posts: string[] = [];

function ok(data: DeskSnapshot, status = 201): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  snap = structuredClone(emptyDesk);
  posts.length = 0;
  vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = String(input).replace(/^https?:\/\/[^/]+/, "");
    const method = init?.method ?? "GET";
    if (method === "POST") posts.push(path);
    if (path.endsWith("/api/desk") && method === "GET") return ok(snap, 200);
    if (path.endsWith("/api/deposits")) {
      snap.deposits.push({
        depositId: "dep_1",
        playerId: "p_1",
        amountCents: 5000,
        status: "pending",
        pspTransactionId: null,
      });
      snap.cashiers.p_1.lastDepositStatus = "pending";
      return ok(snap);
    }
    if (path.endsWith("/api/psp-webhook")) {
      const dep = snap.deposits[0];
      if (dep) {
        dep.status = "captured";
        dep.pspTransactionId = "psp_1";
      }
      snap.cashiers.p_1.availableCents = 5000;
      snap.cashiers.p_1.lastDepositStatus = "captured";
      snap.cashAtPspCents = 5000;
      return ok(snap);
    }
    if (path.endsWith("/api/kyc")) {
      snap.kycCases = [{ kycId: "kyc_1", playerId: "p_1", status: "pending" }];
      snap.players.p_1.kycStatus = "pending";
      return ok(snap);
    }
    if (path.endsWith("/api/kyc-review")) {
      const kyc = snap.kycCases[0];
      if (kyc) kyc.status = "approved";
      snap.players.p_1.kycStatus = "approved";
      snap.players.p_1.kycVerified = true;
      return ok(snap);
    }
    if (path.endsWith("/api/withdrawals")) {
      snap.withdrawals = [
        {
          withdrawId: "wd_1",
          playerId: "p_1",
          amountCents: 2000,
          status: "pending",
          pspTransactionId: null,
        },
      ];
      snap.cashiers.p_1.availableCents = 3000;
      snap.cashiers.p_1.withdrawPendingCents = 2000;
      return ok(snap);
    }
    if (path.endsWith("/api/payout-webhook")) {
      const w = snap.withdrawals[0];
      if (w) w.status = "sent";
      snap.cashiers.p_1.withdrawPendingCents = 0;
      snap.cashAtPspCents = 3000;
      return ok(snap);
    }
    return ok(snap);
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test("cashier walk posts deposit → capture → kyc → withdraw → payout", async () => {
  const user = userEvent.setup();
  render(<App />);
  await waitFor(() => expect(screen.getByTestId("deposit-50")).toBeEnabled());

  await user.click(screen.getByTestId("deposit-50"));
  await waitFor(() => expect(screen.getByTestId("psp-captured")).toBeEnabled());

  await user.click(screen.getByTestId("psp-captured"));
  await waitFor(() => expect(screen.getByTestId("submit-kyc")).toBeEnabled());

  await user.click(screen.getByTestId("submit-kyc"));
  await waitFor(() => expect(screen.getByTestId("approve-kyc")).toBeEnabled());

  await user.click(screen.getByTestId("approve-kyc"));
  await waitFor(() => expect(screen.getByTestId("withdraw-20")).toBeEnabled());

  await user.click(screen.getByTestId("withdraw-20"));
  await waitFor(() => expect(screen.getByTestId("payout-sent")).toBeEnabled());

  await user.click(screen.getByTestId("payout-sent"));
  await waitFor(() => expect(posts.at(-1)).toBe("/api/payout-webhook"));

  expect(posts).toEqual([
    "/api/deposits",
    "/api/psp-webhook",
    "/api/kyc",
    "/api/kyc-review",
    "/api/withdrawals",
    "/api/payout-webhook",
  ]);
});
