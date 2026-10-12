import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  arenaSuite,
  previewScore,
  remainingSeconds,
  type ArenaSummary,
} from '../../../packages/ai-arena';
import { api } from './api';
import { executableSource, FUNCTION_STARTER } from './python/execution';
import { usePythonRun, PythonResults } from './python/usePythonRun';
import SiteFooter from './SiteFooter';
import './ai-arena.css';
const Editor = lazy(() => import('./CodeEditor'));
const nav = [
  ['Overview', '/ai-arena'],
  ['Benchmarks', '/ai-arena/benchmarks'],
  ['Runs', '/ai-arena/runs'],
  ['Leaderboard', '/ai-arena/leaderboard'],
  ['Developer docs', '/ai-arena/docs'],
];
const historyKey = 'codeclash:arena-previews:v1';
function readHistory(key: string): ArenaSummary[] {
  try {
    const data: unknown = JSON.parse(sessionStorage.getItem(key) ?? '[]');
    return Array.isArray(data)
      ? data
          .filter(
            (r): r is ArenaSummary =>
              r &&
              typeof r.id === 'string' &&
              typeof r.agent === 'string' &&
              typeof r.score === 'number' &&
              typeof r.finishedAt === 'number' &&
              Array.isArray(r.passed),
          )
          .slice(0, 20)
      : [];
  } catch {
    return [];
  }
}
export default function AiArena({ path }: { path: string }) {
  return (
    <div className="ai-arena">
      <header className="ai-header">
        <a href="/app" className="ai-brand">
          CODE<span>CLASH</span>
          <small>AI ARENA</small>
        </a>
        <a href="/app">Human arena</a>
      </header>
      <div className="ai-shell">
        <nav className="ai-nav" aria-label="AI Arena">
          {nav.map(([label, href]) => (
            <a key={href} href={href} aria-current={path === href ? 'page' : undefined}>
              {label}
            </a>
          ))}
        </nav>
        <main id="main" className="ai-main">
          {path.endsWith('/runs') ? (
            <ArenaRuns />
          ) : path.endsWith('/benchmarks') ? (
            <>
              <p className="ai-eyebrow">SUITE REGISTRY</p>
              <h1>Know what you’re measuring.</h1>
              <p>
                Versioned suites keep comparisons interpretable. Public examples measure sample
                correctness; they cannot establish hidden-test performance.
              </p>
              <section className="ai-panel">
                <h2>{arenaSuite.title}</h2>
                <p>Version {arenaSuite.version} · Python 3 · 10 problems · Local preview</p>
                <p>
                  A foundational workflow suite drawn from independently checked original CodeClash
                  problems. It is not the advanced agent benchmark.
                </p>
                <ol className="ai-problems">
                  {arenaSuite.problems.map((p) => (
                    <li key={p.id}>
                      <a href={'/problems/' + p.id}>{p.title}</a>
                      <span>
                        {p.difficulty} · {p.topic}
                      </span>
                    </li>
                  ))}
                </ol>
                <a className="button primary" href="/ai-arena/runs">
                  Start a preview run
                </a>
              </section>
              <section className="ai-panel">
                <h2>Advanced challenge suite</h2>
                <p>
                  Planned: temporal connectivity, constrained graph routes, dynamic range queries,
                  digit automata and other combined-constraint tasks. No release date or calibrated
                  difficulty is claimed.
                </p>
              </section>
            </>
          ) : path.endsWith('/leaderboard') ? (
            <>
              <p className="ai-eyebrow">VERIFIED RESULTS</p>
              <h1>A leaderboard built on evidence.</h1>
              <section className="ai-panel">
                <h2>No verified runs yet</h2>
                <p>
                  The trusted judge is not enabled. Local preview scores stay out of this
                  leaderboard.
                </p>
                <p>
                  Published results will include suite version, model version, tools, duration,
                  token budget, repeated-run spread and full solves.
                </p>
                <a href="/ai-arena/runs">Try the local workflow</a>
              </section>
            </>
          ) : path.endsWith('/docs') ? (
            <>
              <p className="ai-eyebrow">INTEGRATION</p>
              <h1>Build a reproducible agent run.</h1>
              <section className="ai-panel">
                <h2>Available now</h2>
                <p>
                  Download the public suite manifest. It contains statements, input contracts and
                  examples, with no private fixtures or solutions.
                </p>
                <pre>
                  <code>curl https://code-clash.com/api/ai-arena/manifest</code>
                </pre>
                <a href="/api/ai-arena/manifest">Open JSON manifest</a>
                <p>
                  Implement solve(data) in Python and return a JSON-compatible value. The preview
                  wrapper reads one JSON input and prints the returned value.
                </p>
              </section>
              <section className="ai-panel">
                <h2>Verified submission API</h2>
                <p>
                  Not available yet. Scoped agent tokens, durable runs, server deadlines and
                  isolated judging must be implemented before remote agents can submit official
                  runs. Do not send model-provider secrets to this site.
                </p>
                <h3>Proposed score</h3>
                <p>
                  100 points per problem: 80 for private correctness groups and 20 for efficiency.
                  Five or more seeded runs per configuration; separate tool-enabled and tool-free
                  tracks. Local preview scores use public examples only and are not comparable to
                  this proposed score.
                </p>
              </section>
            </>
          ) : (
            <>
              <p className="ai-eyebrow">CODECLASH / AGENT EVALUATION</p>
              <h1>
                Put coding agents
                <br />
                through their paces.
              </h1>
              <p className="ai-intro">
                Ten problems. One time budget. A clear record of what passed and how it was tested.
              </p>
              <a className="button primary" href="/ai-arena/runs">
                Start a local preview
              </a>
              <div className="ai-facts">
                <div>
                  <strong>10</strong>
                  <span>Original problems</span>
                </div>
                <div>
                  <strong>10 / 15 min</strong>
                  <span>Choose your run</span>
                </div>
                <div>
                  <strong>Python</strong>
                  <span>Runs on your device</span>
                </div>
              </div>
              <section className="ai-panel">
                <h2>Preview the workflow today.</h2>
                <p>
                  Use the foundational suite to test a coding workflow, switch between problems and
                  review a sample-pass score. Label each run with your model and tools.
                </p>
                <p>
                  This workspace does not call a model for you. You supply solutions.
                  Browser-reported results are unverified; official agent rankings remain closed
                  until trusted judging is ready.
                </p>
                <a href="/ai-arena/benchmarks">Explore the suites</a>
              </section>
            </>
          )}
        </main>
      </div>
      <SiteFooter />
    </div>
  );
}
function ArenaRuns() {
  const [auth, setAuth] = useState<'loading' | 'yes' | 'no' | 'error'>('loading');
  const [userId, setUserId] = useState('');
  const accountHistoryKey = historyKey + ':' + userId;
  const [agent, setAgent] = useState('');
  const [duration, setDuration] = useState(15);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [index, setIndex] = useState(0);
  const [sources, setSources] = useState<Record<string, string>>({});
  const [passed, setPassed] = useState<string[]>([]);
  const [history, setHistory] = useState<ArenaSummary[]>([]);
  const [error, setError] = useState('');
  const finalized = useRef(false);
  const passedRef = useRef<string[]>([]);
  const run = usePythonRun();
  const problem = arenaSuite.problems[index];
  const seconds = deadline === null ? 0 : remainingSeconds(deadline, now);
  useEffect(() => {
    let alive = true;
    api<{ user: { id: string } | null }>('/me')
      .then((v) => {
        if (alive) {
          setAuth(v.user ? 'yes' : 'no');
          if (v.user) {
            setUserId(v.user.id);
            setHistory(readHistory(historyKey + ':' + v.user.id));
          }
        }
      })
      .catch(() => {
        if (alive) setAuth('error');
      });
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    if (deadline === null) return;
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [deadline]);
  const resetRun = run.reset;
  const passedSet = useMemo(() => new Set(passed), [passed]);
  const finish = useCallback(() => {
    if (deadline === null || finalized.current) return;
    finalized.current = true;
    resetRun();
    const result: ArenaSummary = {
      id: crypto.randomUUID(),
      agent: agent.trim(),
      duration,
      finishedAt: Date.now(),
      passed: [...passedRef.current],
      score: previewScore(passedRef.current),
    };
    const updated = [result, ...history].slice(0, 20);
    setHistory(updated);
    setDeadline(null);
    try {
      sessionStorage.setItem(accountHistoryKey, JSON.stringify(updated));
    } catch {
      setError('Session storage unavailable. Keep or download your report before leaving.');
    }
  }, [deadline, agent, duration, history, resetRun, accountHistoryKey]);
  useEffect(() => {
    if (deadline !== null && seconds === 0) finish();
  }, [seconds, deadline, finish]);
  useEffect(() => {
    if (deadline === null) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [deadline]);
  async function check() {
    const end = deadline;
    if (end === null || Date.now() >= end) return;
    const result = await run.run(
      executableSource(sources[problem.id] ?? FUNCTION_STARTER, 'function'),
      problem.examples,
    );
    if (
      result?.length === problem.examples.length &&
      result.every((r) => r.verdict === 'PASS') &&
      Date.now() < end &&
      !finalized.current
    ) {
      if (!passedRef.current.includes(problem.id))
        passedRef.current = [...passedRef.current, problem.id];
      setPassed([...passedRef.current]);
    }
  }
  return (
    <>
      <p className="ai-eyebrow">LOCAL RUNS / UNVERIFIED</p>
      <h1>Your benchmark workbench.</h1>
      <p>
        Public example checks only. No rating change and no verified agent ranking. Reports remain
        in this browser tab’s session, with no submitted source saved.
      </p>
      {auth === 'loading' ? (
        <p role="status">Checking your account…</p>
      ) : auth === 'no' ? (
        <section className="ai-panel">
          <h2>Sign in to start a run</h2>
          <a className="button primary" href="/login">
            Sign in
          </a>
        </section>
      ) : auth === 'error' ? (
        <p role="alert">Account check failed. Reload to try again.</p>
      ) : deadline === null ? (
        <form
          className="ai-panel"
          onSubmit={(e) => {
            e.preventDefault();
            finalized.current = false;
            passedRef.current = [];
            setPassed([]);
            setSources({});
            setIndex(0);
            setError('');
            const time = Date.now();
            setNow(time);
            setDeadline(time + duration * 60000);
            run.reset();
          }}
        >
          <h2>Configure a preview</h2>
          <label>
            Model and tool configuration
            <input
              required
              maxLength={120}
              value={agent}
              onChange={(e) => setAgent(e.target.value)}
              placeholder="Model version, tool setup, or manual trial"
            />
          </label>
          <label>
            Time budget
            <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
              <option value={10}>10 minutes</option>
              <option value={15}>15 minutes</option>
            </select>
          </label>
          <p>
            Python Foundations v1.0.0 · 10 questions · 100 local points per problem whose examples
            pass. This suite is public and unsuitable for contamination-resistant evaluation.
          </p>
          <button type="submit" className="button primary" disabled={!agent.trim()}>
            Start preview
          </button>
        </form>
      ) : (
        <>
          <div className="ai-runbar">
            <strong role="timer" aria-label="Time remaining">
              {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
            </strong>
            <span>{previewScore(passed)} / 1,000 sample points</span>
            <button type="button" className="button" onClick={finish}>
              Finish run
            </button>
          </div>
          <div className="ai-workbench">
            <nav aria-label="Run problems">
              {arenaSuite.problems.map((p, i) => (
                <button
                  type="button"
                  key={p.id}
                  aria-current={index === i ? 'step' : undefined}
                  disabled={!!run.status}
                  onClick={() => {
                    setIndex(i);
                    run.reset();
                  }}
                >
                  {i + 1}. {p.title}
                  {passedSet.has(p.id) ? ' · Passed' : ''}
                </button>
              ))}
            </nav>
            <section className="ai-panel">
              <h2>{problem.title}</h2>
              <p>{problem.statement}</p>
              <details>
                <summary>Input contract and constraints</summary>
                <p>{problem.inputFormat}</p>
                <p>{problem.outputFormat}</p>
                <ul>
                  {problem.constraints.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </details>
              {problem.examples.map((e, i) => (
                <pre key={i}>{'Input: ' + e.input + 'Output: ' + e.output}</pre>
              ))}
              <div className="ai-editor">
                <Suspense fallback={<p>Loading editor…</p>}>
                  <Editor
                    value={sources[problem.id] ?? FUNCTION_STARTER}
                    onChange={(value) => setSources((s) => ({ ...s, [problem.id]: value }))}
                    disabled={!!run.status}
                  />
                </Suspense>
              </div>
              <button
                type="button"
                className="button primary"
                disabled={!!run.status}
                onClick={() => void check()}
              >
                Check public examples
              </button>
              <PythonResults run={run} />
            </section>
          </div>
        </>
      )}
      {error && <p role="alert">{error}</p>}
      <section className="ai-panel">
        <h2>Session reports</h2>
        {history.length === 0 ? (
          <p>No completed local runs in this tab.</p>
        ) : (
          <>
            <button
              type="button"
              className="button"
              onClick={() => {
                const url = URL.createObjectURL(
                  new Blob(
                    [
                      JSON.stringify(
                        {
                          suite: arenaSuite.id,
                          version: arenaSuite.version,
                          verification: 'unverified-public-examples',
                          runs: history,
                        },
                        null,
                        2,
                      ),
                    ],
                    { type: 'application/json' },
                  ),
                );
                const a = document.createElement('a');
                a.href = url;
                a.download = 'codeclash-ai-preview.json';
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              }}
            >
              Download reports
            </button>
            <ul>
              {history.map((r) => (
                <li key={r.id}>
                  <strong>{r.agent}</strong> · {r.score}/1,000 · {r.passed.length}/10 sample passes
                  · {r.duration} min · {new Date(r.finishedAt).toLocaleString()}
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setHistory([]);
                try {
                  sessionStorage.removeItem(accountHistoryKey);
                } catch {
                  /* in-memory clear still works */
                }
              }}
            >
              Clear session reports
            </button>
          </>
        )}
      </section>
    </>
  );
}
