import { useCallback, useEffect, useMemo, useState } from "react";
import {
  api,
  ApiError,
  emptyDesk,
  usd,
  type DeskSnapshot,
  type Deposit,
  type KycCase,
  type PlayerStatus,
  type Round,
  type Withdrawal,
} from "./api";

const PLAYERS = ["p_1", "p_2"] as const;
type Player = (typeof PLAYERS)[number];

function pendingDeposit(desk: DeskSnapshot, player: string): Deposit | undefined {
  return [...desk.deposits].reverse().find((d) => d.playerId === player && d.status === "pending");
}

function pendingWithdraw(desk: DeskSnapshot, player: string): Withdrawal | undefined {
  return [...(desk.withdrawals ?? [])]
    .reverse()
    .find((w) => w.playerId === player && w.status === "pending");
}

function pendingKyc(desk: DeskSnapshot, player: string): KycCase | undefined {
  return [...(desk.kycCases ?? [])]
    .reverse()
    .find((k) => k.playerId === player && k.status === "pending");
}

function lastKyc(desk: DeskSnapshot, player: string): KycCase | undefined {
  return [...(desk.kycCases ?? [])].reverse().find((k) => k.playerId === player);
}

function openRound(desk: DeskSnapshot, player: string): Round | undefined {
  return [...desk.rounds].reverse().find((r) => r.playerId === player && r.status === "open");
}

export function App() {
  const [desk, setDesk] = useState<DeskSnapshot>(emptyDesk);
  const [player, setPlayer] = useState<Player>("p_1");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [seq, setSeq] = useState({ dep: 1, rnd: 1, psp: 1, wd: 1, kyc: 1 });

  const load = useCallback(async () => {
    try {
      setDesk(await api.desk());
    } catch (e) {
      setError(e instanceof ApiError ? `${e.gate ?? e.code}: ${e.message}` : String(e));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (fn: () => Promise<DeskSnapshot>) => {
    setBusy(true);
    setError(null);
    try {
      setDesk(await fn());
    } catch (e) {
      setError(
        e instanceof ApiError
          ? `${e.gate ?? e.code}: ${e.message}`
          : String(e),
      );
    } finally {
      setBusy(false);
    }
  };

  const pending = pendingDeposit(desk, player);
  const kyc = pendingKyc(desk, player);
  const kycRow = lastKyc(desk, player);
  const payout = pendingWithdraw(desk, player);
  const round = openRound(desk, player);
  const cash = desk.cashiers[player];
  const flags = desk.players[player];
  const claims =
    Object.values(desk.cashiers).reduce(
      (s, c) => s + c.availableCents + c.inPlayCents + (c.withdrawPendingCents ?? 0),
      0,
    ) + desk.houseCents;


  const next = useMemo(() => {
    if (pending) return "psp";
    if (kyc) return "kyc";
    if (payout) return "payout";
    if (round) return "settle";
    if ((cash?.availableCents ?? 0) > 0 && !flags?.kycVerified) return "kyc";
    if ((cash?.availableCents ?? 0) > 0) return "bet";
    return "deposit";
  }, [pending, kyc, payout, round, cash, flags]);

  const depositId = `dep_${player}_${seq.dep}`;
  const roundId = `rnd_${player}_${seq.rnd}`;
  const withdrawId = `wd_${player}_${seq.wd}`;
  const kycId = `kyc_${player}_${seq.kyc}`;
  const pspTxn = `psp_${seq.psp}`;

  return (
    <div className="page">
      <header className="top">
        <div>
          <p className="kicker">iGaming money desk · Nest + React</p>
          <h1>PAM owns the book. Cashier only reads.</h1>
        </div>
        <div className="top-actions">
          <a className="ghost nav-link" href="#/exam-bonus">
            Тест Bonus
          </a>
          <a className="ghost nav-link" href="#/exam-psp">
            Тест PSP
          </a>
          <a className="ghost nav-link" href="#/exam-rg">
            Тест RG
          </a>
          <a className="ghost nav-link" href="#/exam-recon">
            Тест recon
          </a>
          <a className="ghost nav-link" href="#/drill">
            Гім
          </a>
          <a className="ghost nav-link" href="#/exam">
            Тест 1–5
          </a>
          <button
            className="ghost"
            data-testid="reset-desk"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                const snap = await api.reset();
                setSeq({ dep: 1, rnd: 1, psp: 1, wd: 1, kyc: 1 });
                return snap;
              })
            }
          >
            Reset desk
          </button>
        </div>
      </header>

      <p className="lede">
        Deposit is TAKE until PSP <em>captured</em>. KYC submit is TAKE until compliance
        <em>approves</em>. Withdraw <em>holds</em> cash on intent.
      </p>

      <section className="identity" aria-label="Books identity">
        <div>
          <span>cash at PSP</span>
          <strong>{usd(desk.cashAtPspCents)}</strong>
        </div>
        <span className="eq">=</span>
        <div>
          <span>player cash + in-play + withdraw hold + house</span>
          <strong className={desk.booksOk ? "ok" : "bad"} title="Assets must equal claims">
            {usd(claims)}
            <em className="books-tag">{desk.booksOk ? " balanced" : " broken"}</em>
          </strong>
        </div>
        <div>
          <span>house P&amp;L</span>
          <strong className={desk.houseCents < 0 ? "loss" : undefined}>{usd(desk.houseCents)}</strong>
        </div>
      </section>

      <section className="recon-desk" aria-label="PAM vs PSP recon">
        <div className="recon-head">
          <div>
            <h2>Recon · PAM vs PSP file</h2>
            <p>
              Green <b>balanced</b> is the book with itself. This button compares <b>two pictures</b>.
              A break is not a ledger row.
            </p>
          </div>
          <button
            data-testid="run-recon"
            className="primary"
            disabled={busy}
            onClick={() => void run(() => api.runRecon())}
          >
            Run recon
          </button>
        </div>
        <details className="recon-hint" data-testid="recon-walk-hint">
          <summary>Walk hint</summary>
          <p>
            Reset desk before each walk. Do not mix fee and ghost on the same book. After plant or
            fix, click <b>Run recon</b> again.
          </p>
          <ol>
            <li>
              <b>A · $0.01 fee.</b> Deposit $50 → Webhook captured → Run recon (clean) → Plant PSP
              fee $0.01 → Run recon (break fee $0.01, books still balanced) → recon_adjust
              (rejected) → Post fee · fee:psp_fee → Run recon (clean). Player stays $50. Cash at
              PSP $49.99, house −$0.01.
            </li>
            <li>
              <b>B · retry is not a break.</b> Reset → Deposit $50 → captured → place_bet $10 →
              Retry same round → Run recon. Clean + “2 HTTP vs 1 PAM row”.
            </li>
            <li>
              <b>C · lost webhook.</b> Reset → Deposit $50 (pending) → PSP captured, no webhook →
              Run recon (captured PAM $0 vs PSP $50) → Webhook captured → Run recon (clean).
            </li>
          </ol>
        </details>
        <div className="recon-actions">
          <div>
            <h3>Break (PSP file only)</h3>
            <button
              data-testid="plant-fee"
              disabled={busy || !desk.deposits.some((d) => d.status === "captured") || desk.pspFile.some((l) => l.kind === "fee")}
              onClick={() => void run(() => api.plantPspFee())}
            >
              Plant PSP fee $0.01
            </button>
            <button
              data-testid="plant-chargeback"
              disabled={
                busy ||
                !desk.deposits.some((d) => d.status === "captured") ||
                desk.pspFile.some((l) => l.kind === "chargeback")
              }
              onClick={() => void run(() => api.plantPspChargeback())}
            >
              Plant chargeback
            </button>
            <button
              data-testid="plant-ghost"
              disabled={busy || !desk.deposits.some((d) => d.status === "pending")}
              onClick={() => void run(() => api.plantGhostCapture())}
            >
              PSP captured, no webhook
            </button>
          </div>
          <div>
            <h3>Fix (named posting)</h3>
            <button
              data-testid="fix-fee"
              disabled={busy || !desk.pspFile.some((l) => l.kind === "fee")}
              onClick={() => void run(() => api.postPspFee())}
            >
              Post fee · fee:psp_fee
            </button>
            <button
              data-testid="fix-chargeback"
              disabled={busy || !desk.pspFile.some((l) => l.kind === "chargeback")}
              onClick={() => void run(() => api.postChargeback())}
            >
              Post chargeback
            </button>
            <button
              data-testid="recon-adjust"
              disabled={busy}
              onClick={() => void run(() => api.reconAdjust())}
            >
              recon_adjust (rejected)
            </button>
          </div>
        </div>
        {desk.recon ? (
          <div className={`recon-result${desk.recon.clean ? " ok" : " bad"}`} data-testid="recon-result">
            <p>
              {desk.recon.clean ? "Clean vs PSP file." : "Break."} Books{" "}
              {desk.recon.booksOk ? "balanced" : "broken inside PAM"}.
            </p>
            {desk.recon.breaks.map((b) => (
              <p key={b.kind}>
                {b.kind}: PAM {usd(b.pamCents)} vs PSP {usd(b.pspCents)} → {usd(b.amountCents)}
              </p>
            ))}
            {desk.recon.notBreaks.map((n) => (
              <p key={n.id} className="recon-not">
                Not a break: {n.detail}
              </p>
            ))}
          </div>
        ) : (
          <p className="recon-idle">No recon yet. Capture $50, then Run recon — should be clean.</p>
        )}
      </section>

      <nav className="steps" aria-label="Money path">
        {(
          [
            ["deposit", "1 · Request deposit", "pending, $0"],
            ["psp", "2 · PSP captured", "then it's money"],
            ["kyc", "3 · KYC", "submit, then approve"],
            ["bet", "4 · Game place_bet", "cash → in-play"],
            ["payout", "5 · Withdraw", "hold, then payout"],
          ] as const
        ).map(([id, label, hint]) => (
          <div key={id} className={next === id ? "on" : undefined}>
            <b>{label}</b>
            <span>{hint}</span>
          </div>
        ))}
      </nav>

      <div className="cashiers">
        {PLAYERS.map((id) => {
          const c = desk.cashiers[id];
          const pv = desk.players[id];
          const live = player === id;
          return (
            <button
              key={id}
              type="button"
              className={`wallet${live ? " live" : ""}`}
              onClick={() => setPlayer(id)}
            >
              <header>
                <span>{id}</span>
                {pv && pv.status !== "active" && (
                  <i className={`pill ${pv.status}`}>{pv.status.replace("_", " ")}</i>
                )}
                {pv && (pv.kycStatus ?? "none") !== "none" && (
                  <i className={`pill ${pv.kycStatus}`}>kyc {pv.kycStatus}</i>
                )}
                {c?.lastDepositStatus && (
                  <i className={`pill ${c.lastDepositStatus}`}>{c.lastDepositStatus}</i>
                )}
              </header>
              <p className="avail">{usd(c?.availableCents ?? 0)}</p>
              <small>available to bet</small>
              <p className="hold">in-play {usd(c?.inPlayCents ?? 0)}</p>
              <p className="hold">withdraw hold {usd(c?.withdrawPendingCents ?? 0)}</p>
            </button>
          );
        })}
      </div>

      <section className="gates" aria-label="PAM entry gates">
        <div>
          <h2>Entry gates · {player}</h2>
          <p>
            Daily deposit remaining{" "}
            <b>{usd(flags?.remainingDepositCents ?? 0)}</b> of {usd(flags?.dailyLimitCents ?? 0)}.
            KYC on deposit: <b>off</b>. Withdraw KYC:{" "}
            <b>
              {flags?.kycVerified
                ? "approved"
                : flags?.kycStatus === "pending"
                  ? "pending review"
                  : flags?.kycStatus === "rejected"
                    ? "rejected"
                    : "required"}
            </b>
            .
          </p>
        </div>
        <div className="status-row">
          {(["active", "frozen", "self_excluded"] as const).map((st: PlayerStatus) => (
            <button
              key={st}
              type="button"
              className={flags?.status === st ? "primary" : undefined}
              disabled={busy}
              onClick={() => void run(() => api.setStatus(player, st))}
            >
              {st.replace("_", " ")}
            </button>
          ))}
        </div>
      </section>

      {error && <p className="err">{error}</p>}

      <div className="actors">
        <article>
          <h2>Cashier</h2>
          <p>Creates intent. Does not post. PAM gates first.</p>
          <button
            data-testid="deposit-50"
            disabled={busy || Boolean(pending)}
            className={next === "deposit" ? "primary" : undefined}
            onClick={() =>
              void run(async () => {
                const snap = await api.deposit(player, 5000, depositId);
                return snap;
              })
            }
          >
            Deposit $50 · {player}
          </button>
          <button
            disabled={busy || Boolean(pending)}
            onClick={() => void run(() => api.deposit(player, 500, `${depositId}_tiny`))}
          >
            Deposit $5 (min gate)
          </button>
          {pending && (
            <p className="note">
              {pending.depositId} is <b>pending</b>. Available stays {usd(cash?.availableCents ?? 0)}.
            </p>
          )}
          <button
            data-testid="submit-kyc"
            disabled={busy || Boolean(kyc) || Boolean(flags?.kycVerified)}
            className={next === "kyc" && !kyc ? "primary" : undefined}
            onClick={() =>
              void run(async () => {
                const snap = await api.submitKyc(player, kycId);
                setSeq((s) => ({ ...s, kyc: s.kyc + 1 }));
                return snap;
              })
            }
          >
            Submit KYC
          </button>
          {kyc && (
            <p className="note">
              {kyc.kycId} is <b>pending</b>. Not verified. No ledger row.
            </p>
          )}
          {flags?.kycStatus === "rejected" && !kyc && (
            <p className="note">Last KYC rejected. Submit again.</p>
          )}
          <button
            data-testid="withdraw-20"
            disabled={busy || Boolean(payout) || (cash?.availableCents ?? 0) < 2000}
            className={next === "payout" && !payout ? "primary" : undefined}
            onClick={() => void run(() => api.withdraw(player, 2000, withdrawId))}
          >
            Withdraw $20
          </button>
          {payout && (
            <p className="note">
              {payout.withdrawId} is <b>held</b>. Available {usd(cash?.availableCents ?? 0)}.
            </p>
          )}
        </article>

        <article>
          <h2>PSP</h2>
          <p>Capture is FILL. Payout is money leaving cash_at_psp. Replay uses the same id.</p>
          <button
            data-testid="psp-captured"
            disabled={busy || !pending}
            className={next === "psp" ? "primary" : undefined}
            onClick={() =>
              void run(async () => {
                if (!pending) return desk;
                const snap = await api.webhook(pending.depositId, "captured", pspTxn);
                setSeq((s) => ({ ...s, dep: s.dep + 1, psp: s.psp + 1 }));
                return snap;
              })
            }
          >
            Webhook captured
          </button>
          <button
            disabled={busy || !pending}
            onClick={() =>
              void run(async () => {
                if (!pending) return desk;
                const snap = await api.webhook(pending.depositId, "failed", pspTxn);
                setSeq((s) => ({ ...s, dep: s.dep + 1, psp: s.psp + 1 }));
                return snap;
              })
            }
          >
            Webhook failed
          </button>
          <button
            disabled={busy || desk.deposits.filter((d) => d.playerId === player && d.status === "captured").length === 0}
            onClick={() => {
              const last = [...desk.deposits]
                .reverse()
                .find((d) => d.playerId === player && d.status === "captured");
              if (!last?.pspTransactionId) return;
              void run(() =>
                api.webhook(last.depositId, "captured", last.pspTransactionId!),
              );
            }}
          >
            Replay last captured
          </button>
          <button
            data-testid="payout-sent"
            disabled={busy || !payout}
            className={next === "payout" && payout ? "primary" : undefined}
            onClick={() =>
              void run(async () => {
                if (!payout) return desk;
                const snap = await api.payout(payout.withdrawId, "payout_sent", `pay_${seq.psp}`);
                setSeq((s) => ({ ...s, wd: s.wd + 1, psp: s.psp + 1 }));
                return snap;
              })
            }
          >
            Payout sent
          </button>
          <button
            disabled={busy || !payout}
            onClick={() =>
              void run(async () => {
                if (!payout) return desk;
                const snap = await api.payout(payout.withdrawId, "failed", `pay_${seq.psp}`);
                setSeq((s) => ({ ...s, wd: s.wd + 1, psp: s.psp + 1 }));
                return snap;
              })
            }
          >
            Payout failed
          </button>
        </article>

        <article>
          <h2>Compliance</h2>
          <p>Approve is FILL. Cashier submit is not verified. No posting.</p>
          <button
            data-testid="approve-kyc"
            disabled={busy || !kyc}
            className={next === "kyc" && kyc ? "primary" : undefined}
            onClick={() => {
              if (!kyc) return;
              void run(() => api.reviewKyc(kyc.kycId, "approved"));
            }}
          >
            Approve KYC
          </button>
          <button
            disabled={busy || !kyc}
            onClick={() => {
              if (!kyc) return;
              void run(() => api.reviewKyc(kyc.kycId, "rejected"));
            }}
          >
            Reject KYC
          </button>
          {kycRow && !kyc && (
            <p className="note">
              {kycRow.kycId} is <b>{kycRow.status}</b>.
            </p>
          )}
        </article>

        <article>
          <h2>Game (seamless)</h2>
          <p>No copy of the wallet. Timeout retry = same round_id.</p>
          <button
            disabled={busy || Boolean(round) || (cash?.availableCents ?? 0) < 1000}
            className={next === "bet" ? "primary" : undefined}
            onClick={() => void run(() => api.bet(player, roundId, 1000))}
          >
            place_bet $10
          </button>
          <button
            disabled={busy || !round}
            onClick={() => {
              if (!round) return;
              void run(() => api.bet(player, round.roundId, round.stakeCents));
            }}
          >
            Retry same round
          </button>
          <div className="row">
            <button
              disabled={busy || !round}
              className={next === "settle" ? "primary" : undefined}
              onClick={() =>
                void run(async () => {
                  if (!round) return desk;
                  const snap = await api.settle(round.roundId, 0);
                  setSeq((s) => ({ ...s, rnd: s.rnd + 1 }));
                  return snap;
                })
              }
            >
              Lose
            </button>
            <button
              disabled={busy || !round}
              onClick={() =>
                void run(async () => {
                  if (!round) return desk;
                  const snap = await api.settle(round.roundId, round.stakeCents);
                  setSeq((s) => ({ ...s, rnd: s.rnd + 1 }));
                  return snap;
                })
              }
            >
              Void
            </button>
            <button
              disabled={busy || !round}
              onClick={() =>
                void run(async () => {
                  if (!round) return desk;
                  const snap = await api.settle(round.roundId, 2500);
                  setSeq((s) => ({ ...s, rnd: s.rnd + 1 }));
                  return snap;
                })
              }
            >
              Win $25
            </button>
          </div>
        </article>
      </div>

      <section className="journal gate-tape">
        <header>
          <h2>Gate tape</h2>
          <span>PAM allow / deny · not the ledger</span>
        </header>
        {desk.gateLog.length === 0 ? (
          <p className="empty">No gate decisions yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>action</th>
                <th>player</th>
                <th>result</th>
                <th>gate</th>
                <th>why</th>
              </tr>
            </thead>
            <tbody>
              {desk.gateLog.map((g, i) => (
                <tr key={`${g.action}-${i}`} className={g.result === "deny" ? "deny" : undefined}>
                  <td>{i + 1}</td>
                  <td>{g.action}</td>
                  <td>{g.playerId}</td>
                  <td>{g.result}</td>
                  <td>
                    <code>{g.gate}</code>
                  </td>
                  <td>{g.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="journal">
        <header>
          <h2>KYC cases</h2>
          <span>not the ledger</span>
        </header>
        {(desk.kycCases ?? []).length === 0 ? (
          <p className="empty">No KYC yet. Submit is TAKE; approve is FILL.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>id</th>
                <th>player</th>
                <th>status</th>
              </tr>
            </thead>
            <tbody>
              {(desk.kycCases ?? []).map((k, i) => (
                <tr key={k.kycId}>
                  <td>{i + 1}</td>
                  <td>
                    <code>{k.kycId}</code>
                  </td>
                  <td>{k.playerId}</td>
                  <td>{k.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="journal">
        <header>
          <h2>PSP file</h2>
          <span>second picture · not the ledger</span>
        </header>
        {(desk.pspFile ?? []).length === 0 ? (
          <p className="empty">Empty. Capture / payout write lines here. Plant adds a line without a PAM row.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>kind</th>
                <th>amount</th>
                <th>ref</th>
              </tr>
            </thead>
            <tbody>
              {(desk.pspFile ?? []).map((l, i) => (
                <tr key={`${l.kind}-${l.ref}`}>
                  <td>{i + 1}</td>
                  <td>{l.kind}</td>
                  <td>{usd(l.amountCents)}</td>
                  <td>
                    <code>{l.ref}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="journal">
        <header>
          <h2>Ledger</h2>
          <span>{desk.postings.length} posting{desk.postings.length === 1 ? "" : "s"}</span>
        </header>
        {desk.postings.length === 0 ? (
          <p className="empty">No postings yet. Pending is not a row.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>event</th>
                <th>debit</th>
                <th>credit</th>
                <th>amount</th>
                <th>idempotency key</th>
              </tr>
            </thead>
            <tbody>
              {desk.postings.map((p, i) => (
                <tr key={p.idempotencyKey} className={i === desk.postings.length - 1 ? "fresh" : undefined}>
                  <td>{i + 1}</td>
                  <td>{p.event}</td>
                  <td>{p.debit}</td>
                  <td>{p.credit}</td>
                  <td>{usd(p.amountCents)}</td>
                  <td>
                    <code>{p.idempotencyKey}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
