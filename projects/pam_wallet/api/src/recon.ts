/** PAM vs PSP file. A break is a fact, not a posting. */

export const MONEY_KINDS = ["captured", "payout", "fee", "chargeback"] as const;
export type MoneyKind = (typeof MONEY_KINDS)[number];

export type ReconTotals = Record<MoneyKind, number>;

export type PspLine = {
  kind: MoneyKind;
  amountCents: number;
  ref: string;
};

export type ReconBreak = {
  kind: MoneyKind;
  pamCents: number;
  pspCents: number;
  amountCents: number;
};

export type ReconReport = {
  booksOk: boolean;
  clean: boolean;
  pam: ReconTotals;
  psp: ReconTotals;
  breaks: ReconBreak[];
  notBreaks: { id: string; detail: string }[];
};

export function emptyTotals(): ReconTotals {
  return { captured: 0, payout: 0, fee: 0, chargeback: 0 };
}

export function sumPsp(lines: readonly PspLine[]): ReconTotals {
  const t = emptyTotals();
  for (const line of lines) t[line.kind] += line.amountCents;
  return t;
}

export function runRecon(input: {
  booksOk: boolean;
  pam: ReconTotals;
  psp: ReconTotals;
  betHttp: number;
  betRows: number;
}): ReconReport {
  const breaks: ReconBreak[] = [];
  for (const kind of MONEY_KINDS) {
    const pamCents = input.pam[kind];
    const pspCents = input.psp[kind];
    if (pamCents === pspCents) continue;
    breaks.push({
      kind,
      pamCents,
      pspCents,
      amountCents: Math.abs(pamCents - pspCents),
    });
  }
  const notBreaks: ReconReport["notBreaks"] = [];
  if (input.betHttp > input.betRows) {
    notBreaks.push({
      id: "bet_replay",
      detail: `${input.betHttp} HTTP place_bet vs ${input.betRows} PAM row(s) — same round_id, not a PSP break`,
    });
  }
  return {
    booksOk: input.booksOk,
    clean: breaks.length === 0,
    pam: input.pam,
    psp: input.psp,
    breaks,
    notBreaks,
  };
}
