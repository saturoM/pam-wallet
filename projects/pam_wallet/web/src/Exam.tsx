import { useEffect, useState } from "react";
import {
  quizApi,
  reconQuizApi,
  rgQuizApi,
  pspQuizApi,
  bonusQuizApi,
  kycQuizApi,
  type CheckResult,
  type PostingAnswer,
  type PublicQuestion,
  type QuizAnswers,
  type QuizPaper,
  type QuizResult,
} from "./api";

type ExamPack = "money" | "recon" | "rg" | "psp" | "bonus" | "kyc";

const FIELD_LABEL: Record<string, string> = {
  new_postings: "нових проводок",
  player_cash: "player_cash $",
  bets_in_play: "bets_in_play $",
  postings: "проводок (шт)",
  available: "доступно $",
  hold: "hold $",
  in_play: "in-play $",
  amount: "сума $",
  house: "house $",
};

const emptyPosting: PostingAnswer = { debit: "", credit: "", amount: "", key: "" };

const ACCOUNTS = [
  "cash_at_psp",
  "player_cash",
  "bets_in_play",
  "house",
  "withdraw_in_flight",
] as const;

const KEY_PREFIXES = [
  "captured:dep_1",
  "bet:rnd_1",
  "settle:rnd_1",
  "withdraw:wd_1",
  "payout:wd_1",
  "payout_fail:wd_1",
];

export function Exam({ pack = "money" }: { pack?: ExamPack }) {
  const api =
    pack === "recon"
      ? reconQuizApi
      : pack === "rg"
        ? rgQuizApi
        : pack === "psp"
          ? pspQuizApi
          : pack === "bonus"
            ? bonusQuizApi
            : pack === "kyc"
              ? kycQuizApi
              : quizApi;
  const [paper, setPaper] = useState<QuizPaper | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [checks, setChecks] = useState<Record<string, CheckResult>>({});
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState<string | null>(null);

  useEffect(() => {
    void api
      .paper()
      .then(setPaper)
      .catch((e) => setError(String(e)));
  }, [api]);

  const patch = (id: string, next: QuizAnswers[string]) => {
    setAnswers((a) => ({ ...a, [id]: { ...a[id], ...next } }));
    setResult(null);
    setChecks((c) => {
      const next = { ...c };
      delete next[id];
      return next;
    });
  };

  const checkOne = async (id: string) => {
    setChecking(id);
    setError(null);
    try {
      const r = await api.check(id, answers[id] ?? {});
      setChecks((c) => ({ ...c, [id]: r }));
    } catch (e) {
      setError(String(e));
    } finally {
      setChecking(null);
    }
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      setResult(await api.grade(answers));
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page exam-page">
      <header className="top">
        <div>
          <p className="kicker">
            {pack === "kyc"
              ? "Тест · KYC"
              : pack === "bonus"
                ? "Тест · Bonus"
                : pack === "psp"
                  ? "Тест · PSP"
                  : pack === "rg"
                    ? "Тест · RG"
                    : pack === "recon"
                      ? "Тест · recon"
                      : "Тест · лекції 1–5"}
          </p>
          <h1>{paper?.title ?? "Завантаження…"}</h1>
        </div>
        <div className="top-actions">
          <a className="ghost nav-link" href="#/">
            На desk
          </a>
          <a className="ghost nav-link" href="#/exam-kyc">
            Тест KYC
          </a>
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
          <a className="ghost nav-link" href="#/exam">
            Тест 1–5
          </a>
          <a className="ghost nav-link" href="#/drill">
            Гім
          </a>
        </div>
      </header>
      <p className="lede">
        PAM перевіряє відповіді. Касир сюди не пише баланс. ~{paper?.minutes ?? 20} хв.
      </p>
      {pack === "kyc" ? (
        <details className="exam-crib" open>
          <summary>Шпаргалка · KYC</summary>
          <ul>
            <li>Депозит + гра до KYC; вивід після <strong>verified</strong>.</li>
            <li>Submit = pending. Webhook вендора ≠ PAM, поки PAM не записав.</li>
            <li>Reject не void-ить відкритий раунд. EDD ≠ звичайний Reject.</li>
            <li>Freeze ≠ KYC failed ≠ self-ex.</li>
          </ul>
        </details>
      ) : pack === "bonus" ? (
        <details className="exam-crib" open>
          <summary>Шпаргалка · Bonus</summary>
          <ul>
            <li>Cash і bonus — <strong>дві</strong> кишені (ring-fence).</li>
            <li>Грант ≠ PSP <code>captured</code>. Wagering = оборот ×N.</li>
            <li>Вивід cash при відкритому bonus → <strong>forfeit</strong> bonus.</li>
            <li>Abuse → <strong>hold</strong> на payout, не <code>payout_sent</code>.</li>
          </ul>
        </details>
      ) : pack === "psp" ? (
        <details className="exam-crib" open>
          <summary>Шпаргалка · PSP</summary>
          <ul>
            <li>3DS ok ≠ FILL. FILL = <code>captured</code>.</li>
            <li>3DS fail → <code>failed</code>. Не retry як capture.</li>
            <li>Cascade = новий <code>deposit_id</code> після soft decline.</li>
            <li>Hard decline — без cascade. Ключ книги = <code>deposit_id</code>.</li>
          </ul>
        </details>
      ) : pack === "rg" ? (
        <details className="exam-crib" open>
          <summary>RG — прапорець, не проводка</summary>
          <p>
            <strong>Ліміт депозиту</strong> — ще на сайті, стеля на заведення.{" "}
            <strong>Self-exclusion</strong> — вийшов; вивід можна. <strong>Freeze</strong> — оператор,
            виводу немає. Новий клік після self-ex — <strong>gate</strong>. Раунд уже в грі —{" "}
            <strong>void</strong>, не lose. Captured після self-ex у кишеню не класти: refund у PSP,
            не вивід з каси.
          </p>
        </details>
      ) : pack === "recon" ? (
        <details className="exam-crib" open>
          <summary>Recon — не проводка</summary>
          <p>
            <strong>balanced</strong> = книга сама з собою. Recon = PAM vs файл PSP. Різниця $0.01 —
            break, не рядок <code>recon_adjust</code>. Два HTTP на той самий <code>rnd_1</code> — не
            діра.
          </p>
        </details>
      ) : (
      <details className="exam-crib" open>
        <summary>Debit / credit / ключ — не вгадувати назви</summary>
        <p>
          <strong>Debit = звідки зняли. Credit = куди поклали.</strong> Обидва завжди заповнені.
          Не «хто клікнув». Гравець на captured — <code>credit player_cash</code>, не debit.
        </p>
        <table>
          <thead>
            <tr>
              <th>Рахунок</th>
              <th>Конверт</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>cash_at_psp</code>
              </td>
              <td>сейф казино в PSP</td>
            </tr>
            <tr>
              <td>
                <code>player_cash</code>
              </td>
              <td>кишеня (доступно)</td>
            </tr>
            <tr>
              <td>
                <code>bets_in_play</code>
              </td>
              <td>конверт раунду</td>
            </tr>
            <tr>
              <td>
                <code>house</code>
              </td>
              <td>каса казино</td>
            </tr>
            <tr>
              <td>
                <code>withdraw_in_flight</code>
              </td>
              <td>конверт виводу</td>
            </tr>
          </tbody>
        </table>
        <p>
          Ключ = <code>подія:id</code> з умови. Id той самий (<code>dep_1</code> /{" "}
          <code>rnd_1</code> / <code>wd_1</code>), префікс — що сталося:
        </p>
        <ul>
          <li>
            captured PSP → <code>captured:dep_1</code>
          </li>
          <li>
            ставка → <code>bet:rnd_1</code> (не captured)
          </li>
          <li>
            кінець раунду → <code>settle:rnd_1</code>
          </li>
          <li>
            клік Withdraw → <code>withdraw:wd_1</code>
          </li>
          <li>
            payout ok → <code>payout:wd_1</code> · fail → <code>payout_fail:wd_1</code>
          </li>
        </ul>
      </details>
      )}
      {error && <p className="err">{error}</p>}
      {result && (
        <p className="exam-score" data-testid="exam-score">
          {result.correct} / {result.total}
        </p>
      )}
      <datalist id="exam-keys">
        {KEY_PREFIXES.map((k) => (
          <option key={k} value={k} />
        ))}
      </datalist>
      {paper && (
        <ol className="exam-list">
          {paper.questions.map((q, i) => (
            <Question
              key={q.id}
              n={i + 1}
              q={q}
              pack={pack}
              value={answers[q.id]}
              marked={result?.items.find((m) => m.id === q.id)}
              check={checks[q.id]}
              checking={checking === q.id}
              onChange={(next) => patch(q.id, next)}
              onCheck={() => void checkOne(q.id)}
            />
          ))}
        </ol>
      )}
      {paper && (
        <button
          className="primary exam-submit"
          data-testid="exam-submit"
          disabled={busy}
          onClick={() => void submit()}
        >
          Здати PAM
        </button>
      )}
    </div>
  );
}

function Question(props: {
  n: number;
  q: PublicQuestion;
  pack: ExamPack;
  value: QuizAnswers[string] | undefined;
  marked: { ok: boolean; explanation: string } | undefined;
  check: CheckResult | undefined;
  checking: boolean;
  onChange: (next: QuizAnswers[string]) => void;
  onCheck: () => void;
}) {
  const { n, q, pack, value, marked, check, checking, onChange, onCheck } = props;
  const tone = marked ?? check;
  return (
    <li className={`exam-q${tone ? (tone.ok ? " ok" : " bad") : ""}`}>
      <p>
        <span className="exam-n">
          {pack === "rg" ? `${n} · RG` : pack === "recon" ? `${n} · recon` : `${n} · лекція ${q.lecture}`}
        </span>
        {q.prompt}
      </p>
      {q.kind === "choice" && q.options && (
        <div className="exam-choices">
          {q.options.map((opt) => (
            <label key={opt}>
              <input
                type="radio"
                name={q.id}
                checked={value?.choice === opt}
                onChange={() => onChange({ choice: opt })}
              />
              {opt}
            </label>
          ))}
        </div>
      )}
      {q.kind === "posting" && (
        <div className="exam-posting">
          {(["debit", "credit"] as const).map((f) => (
            <label key={f}>
              {f === "debit" ? "debit (звідки)" : "credit (куди)"}
              <select
                data-testid={`${q.id}-${f}`}
                value={value?.posting?.[f] ?? ""}
                onChange={(e) =>
                  onChange({
                    posting: { ...emptyPosting, ...value?.posting, [f]: e.target.value },
                  })
                }
              >
                <option value="">— рахунок —</option>
                {ACCOUNTS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <label>
            amount
            <input
              data-testid={`${q.id}-amount`}
              value={value?.posting?.amount ?? ""}
              onChange={(e) =>
                onChange({
                  posting: { ...emptyPosting, ...value?.posting, amount: e.target.value },
                })
              }
            />
          </label>
          <label>
            key (подія:id)
            <input
              list="exam-keys"
              data-testid={`${q.id}-key`}
              value={value?.posting?.key ?? ""}
              onChange={(e) =>
                onChange({
                  posting: { ...emptyPosting, ...value?.posting, key: e.target.value },
                })
              }
            />
          </label>
        </div>
      )}
      {q.kind === "numbers" && q.fields && (
        <div className="exam-posting">
          {q.fields.map((f) => (
            <label key={f}>
              {FIELD_LABEL[f] ?? f}
              <input
                data-testid={`${q.id}-${f}`}
                value={value?.numbers?.[f] ?? ""}
                onChange={(e) =>
                  onChange({ numbers: { ...value?.numbers, [f]: e.target.value } })
                }
              />
            </label>
          ))}
        </div>
      )}
      <button
        type="button"
        className="exam-check"
        data-testid={`check-${q.id}`}
        disabled={checking}
        onClick={onCheck}
      >
        Перевірити відповідь
      </button>
      {check?.ok && <p className="exam-ok">Так.</p>}
      {check && !check.ok && check.hint && (
        <p className="exam-hint" data-testid={`hint-${q.id}`}>
          Hint: {check.hint}
        </p>
      )}
      {marked && <p className="exam-why">{marked.explanation}</p>}
    </li>
  );
}
