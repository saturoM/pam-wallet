import { useEffect, useState } from "react";
import {
  drillApi,
  type CheckResult,
  type DrillAnswer,
  type DrillAnswers,
  type DrillPaper,
  type PublicCard,
  type QuizResult,
} from "./api";

const STORE = "pam-drill-answers";

function loadStore(): DrillAnswers {
  try {
    const raw = localStorage.getItem(STORE);
    if (!raw) return {};
    return JSON.parse(raw) as DrillAnswers;
  } catch {
    return {};
  }
}

export function Drill() {
  const [paper, setPaper] = useState<DrillPaper | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<DrillAnswers>(loadStore);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [checks, setChecks] = useState<Record<string, CheckResult>>({});
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState<string | null>(null);

  useEffect(() => {
    void drillApi
      .paper()
      .then(setPaper)
      .catch((e) => setError(String(e)));
  }, []);

  useEffect(() => {
    localStorage.setItem(STORE, JSON.stringify(answers));
  }, [answers]);

  const patch = (id: string, next: DrillAnswer) => {
    setAnswers((a) => ({ ...a, [id]: { ...a[id], ...next } }));
    setResult(null);
    setChecks((c) => {
      const copy = { ...c };
      delete copy[id];
      return copy;
    });
  };

  const checkOne = async (id: string) => {
    setChecking(id);
    setError(null);
    try {
      const r = await drillApi.check(id, answers[id] ?? {});
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
      setResult(await drillApi.grade(answers));
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
          <p className="kicker">Гім · log + sequence</p>
          <h1>{paper?.title ?? "Завантаження…"}</h1>
        </div>
        <div className="top-actions">
          <a className="ghost nav-link" href="#/">
            На desk
          </a>
          <a className="ghost nav-link" href="#/exam-psp">
            Тест PSP
          </a>
          <a className="ghost nav-link" href="#/exam-rg">
            Тест RG
          </a>
          <a className="ghost nav-link" href="#/exam">
            Тест 1–5
          </a>
        </div>
      </header>
      <p className="lede">
        PAM перевіряє ключові слова. Пиши своїми словами. Hint лише якщо мимо. Чернетки
        лишаються в браузері. ~{paper?.minutes ?? 10} хв.
      </p>
      {error && <p className="err">{error}</p>}
      {result && (
        <p className="exam-score" data-testid="drill-score">
          {result.correct} / {result.total}
        </p>
      )}
      {paper && (
        <ol className="exam-list">
          {paper.cards.map((q) => (
            <Card
              key={q.id}
              q={q}
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
          data-testid="drill-submit"
          disabled={busy}
          onClick={() => void submit()}
        >
          Здати PAM
        </button>
      )}
    </div>
  );
}

function Card(props: {
  q: PublicCard;
  value: DrillAnswer | undefined;
  marked: { ok: boolean; explanation: string } | undefined;
  check: CheckResult | undefined;
  checking: boolean;
  onChange: (next: DrillAnswer) => void;
  onCheck: () => void;
}) {
  const { q, value, marked, check, checking, onChange, onCheck } = props;
  const tone = marked ?? check;
  return (
    <li className={`exam-q${tone ? (tone.ok ? " ok" : " bad") : ""}`}>
      <p>
        <span className="exam-n">{q.title}</span>
        {q.task}
      </p>
      <blockquote className="drill-stim">{q.stimulus}</blockquote>
      {q.kind === "write" && (
        <label className="drill-write">
          Твоє речення
          <textarea
            data-testid={`${q.id}-text`}
            rows={4}
            value={value?.text ?? ""}
            onChange={(e) => onChange({ text: e.target.value })}
          />
        </label>
      )}
      {q.kind === "classify" && q.fields && (
        <div className="exam-posting drill-classify">
          {q.fields.map((f) => (
            <label key={f.id}>
              {f.prompt}
              <select
                data-testid={`${q.id}-${f.id}`}
                value={value?.classify?.[f.id] ?? ""}
                onChange={(e) =>
                  onChange({
                    classify: { ...value?.classify, [f.id]: e.target.value },
                  })
                }
              >
                <option value="">— ярлик —</option>
                {f.options.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
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
        Перевірити
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
