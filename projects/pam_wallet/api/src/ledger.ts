/** Double-entry ledger. Balance is never stored; it is the sum of postings. */

const LIABILITY_BASES = new Set(["player_cash", "bets_in_play", "withdraw_in_flight", "house"]);

export class LedgerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LedgerError";
  }
}

export class InsufficientFunds extends LedgerError {
  constructor(message: string) {
    super(message);
    this.name = "InsufficientFunds";
  }
}

export class GateBlocked extends LedgerError {
  constructor(
    public readonly gate: string,
    message: string,
  ) {
    super(message);
    this.name = "GateBlocked";
  }
}

export type Posting = {
  debit: string;
  credit: string;
  amountCents: number;
  idempotencyKey: string;
  event: string;
};

function base(account: string): string {
  return account.split(":")[0] ?? account;
}

export class Ledger {
  private readonly _postings: Posting[] = [];
  private readonly _keys = new Set<string>();

  post(posting: Posting): boolean {
    if (posting.amountCents <= 0) throw new LedgerError("amount must be positive");
    if (posting.debit === posting.credit) throw new LedgerError("debit and credit must differ");
    if (this._keys.has(posting.idempotencyKey)) return false;
    this._keys.add(posting.idempotencyKey);
    this._postings.push(posting);
    return true;
  }

  signedBalance(account: string): number {
    const debit = this._postings
      .filter((p) => p.debit === account)
      .reduce((s, p) => s + p.amountCents, 0);
    const credit = this._postings
      .filter((p) => p.credit === account)
      .reduce((s, p) => s + p.amountCents, 0);
    if (LIABILITY_BASES.has(base(account))) return credit - debit;
    return debit - credit;
  }

  booksBalance(): boolean {
    const accounts = new Set<string>();
    for (const p of this._postings) {
      accounts.add(p.debit);
      accounts.add(p.credit);
    }
    let assets = 0;
    let claims = 0;
    for (const a of accounts) {
      const bal = this.signedBalance(a);
      if (LIABILITY_BASES.has(base(a))) claims += bal;
      else assets += bal;
    }
    return assets === claims;
  }

  get postings(): readonly Posting[] {
    return this._postings;
  }
}
