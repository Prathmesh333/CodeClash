import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { api } from './api';
import { usePythonRun, PythonResults } from './python/usePythonRun';
import './practice.css';
import SplitPane from './SplitPane';
import CustomRun from './python/CustomRun';
import { executableSource, FUNCTION_STARTER, type ExecutionMode } from './python/execution';
import type { LocalResult } from './python/runner';
type Attempt = {
  id: string;
  execution_mode: ExecutionMode;
  results_json: string;
  created_at: number;
};
type Editorial = {
  explanation: string;
  timeComplexity: string;
  spaceComplexity: string;
  code: string;
};
const CodeEditor = lazy(() => import('./CodeEditor'));
type Entry = {
  id: string;
  title: string;
  topic: string;
  difficulty: string;
  status: string | null;
};
type Problem = Entry & {
  statement: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string[];
  examples: { input: string; output: string; explanation?: string }[];
  starterCode: string;
  matchEligible?: boolean;
};
export default function Practice({ userId }: { userId: string }) {
  const [catalog, setCatalog] = useState<Entry[]>([]),
    [problem, setProblem] = useState<Problem | null>(null);
  const [source, setSource] = useState(''),
    [topic, setTopic] = useState(''),
    [difficulty, setDifficulty] = useState(''),
    [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [saved, setSaved] = useState('');
  const run = usePythonRun();
  const [mode, setMode] = useState<ExecutionMode>('script');
  const [baseline, setBaseline] = useState('');
  const [baselineMode, setBaselineMode] = useState<ExecutionMode>('script');
  const [panel, setPanel] = useState<'problem' | 'editorial' | 'history'>('problem');
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [editorial, setEditorial] = useState<Editorial | null>(null);
  const [caseInput, setCaseInput] = useState(0);
  const [consoleTab, setConsoleTab] = useState<'examples' | 'custom'>('examples');
  useEffect(() => {
    let cancelled = false;
    api<{ problems: Entry[] }>('/practice')
      .then((v) => {
        if (!cancelled) setCatalog(v.problems);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);
  const openedLink = useRef(false);
  useEffect(() => {
    const id = new URL(location.href).searchParams.get('problem');
    if (!openedLink.current && id && catalog.some((p) => p.id === id)) {
      openedLink.current = true;
      void open(id);
    }
  }, [catalog]);
  const filtered = catalog.filter(
    (p) =>
      (!topic || p.topic === topic) &&
      (!difficulty || p.difficulty === difficulty) &&
      p.title.toLowerCase().includes(search.toLowerCase()),
  );
  async function open(id: string) {
    if (run.status || busy) return;
    if (
      problem &&
      (source !== baseline || mode !== baselineMode) &&
      !window.confirm('Open another problem? Save your current draft first if you want to keep it.')
    )
      return;
    setBusy(true);
    setError('');
    try {
      const v = await api<{
        problem: Problem;
        progress: { source: string; execution_mode: ExecutionMode } | null;
      }>('/practice/' + id);
      run.reset();
      setProblem(v.problem);
      const nextMode =
        v.progress?.execution_mode ?? (v.problem.matchEligible === false ? 'function' : 'script');
      const nextSource =
        v.progress?.source ?? (nextMode === 'function' ? FUNCTION_STARTER : v.problem.starterCode);
      setMode(nextMode);
      setBaselineMode(nextMode);
      setSource(nextSource);
      setBaseline(nextSource);
      setPanel('problem');
      setEditorial(null);
      setAttempts([]);
      setCaseInput(0);
      setConsoleTab('examples');
      setSaved('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function save(status = 'attempted') {
    if (!problem) return;
    setBusy(true);
    try {
      await api('/practice/' + problem.id, { source, status, executionMode: mode });
      setSaved(
        status === 'examples_passed' ? 'Examples passed · saved (unverified)' : 'Draft saved',
      );
      setBaseline(source);
      setBaselineMode(mode);
      setCatalog((c) => c.map((p) => (p.id === problem.id ? { ...p, status } : p)));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function check() {
    if (!problem || busy || run.status) return;
    setError('');
    setConsoleTab('examples');
    const results = await run.run(executableSource(source, mode), problem.examples);
    if (!results?.length) return;
    setBusy(true);
    const status =
      results.length === problem.examples.length && results.every((r) => r.verdict === 'PASS')
        ? 'examples_passed'
        : 'attempted';
    try {
      await api('/practice/' + problem.id + '/attempts', {
        id: crypto.randomUUID(),
        source,
        executionMode: mode,
        status,
        results: results.map(({ verdict, runtimeMs }) => ({ verdict, runtimeMs })),
      });
      setSaved(
        status === 'examples_passed'
          ? 'Examples passed · saved (unverified)'
          : 'Attempt and draft saved (unverified)',
      );
      setBaseline(source);
      setBaselineMode(mode);
      setCatalog((c) => c.map((p) => (p.id === problem.id ? { ...p, status } : p)));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function showPanel(next: 'problem' | 'editorial' | 'history') {
    if (!problem || busy) return;
    setPanel(next);
    setError('');
    if (next === 'problem') return;
    setBusy(true);
    try {
      if (next === 'editorial') {
        const v = await api<{ editorial: Editorial }>('/practice/' + problem.id + '/editorial');
        setEditorial(v.editorial);
      } else {
        const v = await api<{ attempts: Attempt[] }>('/practice/' + problem.id + '/attempts');
        setAttempts(v.attempts);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function restore(id: string) {
    if (!problem || busy || run.status) return;
    if (
      (source !== baseline || mode !== baselineMode) &&
      !window.confirm('Replace your unsaved draft with this attempt?')
    )
      return;
    setBusy(true);
    try {
      const v = await api<{ attempt: Attempt & { source: string } }>(
        '/practice/' + problem.id + '/attempts/' + id,
      );
      setSource(v.attempt.source);
      setMode(v.attempt.execution_mode);
      setSaved('Attempt loaded. Save draft to keep this version.');
      run.reset();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="practice-page">
      <header>
        <h1>Solo practice</h1>
        <p>
          One problem at a time. No timer. Python runs on your device; practice never changes your
          rating.
        </p>
        <p>
          <a href="https://neetcode.io/practice" target="_blank" rel="noreferrer">
            NeetCode topic roadmap
          </a>{' '}
          ·{' '}
          <a href="https://leetcode.com/problemset/" target="_blank" rel="noreferrer">
            LeetCode problem library
          </a>
        </p>
        <p>
          {catalog.length} problems · {catalog.filter((p) => p.status === 'examples_passed').length}{' '}
          with examples passed
        </p>
      </header>
      {error && <p role="alert">{error}</p>}
      <div className="practice-filters">
        <label>
          Topic
          <select aria-label="Topic" value={topic} onChange={(e) => setTopic(e.target.value)}>
            <option value="">All topics</option>
            {[...new Set(catalog.map((p) => p.topic))].sort().map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label>
          Difficulty
          <select
            aria-label="Difficulty"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
          >
            <option value="">All levels</option>
            {['Easy', 'Medium', 'Hard'].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label>
          Find a problem
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search titles"
          />
        </label>
        <button
          className="button primary"
          disabled={busy || !!run.status || !filtered.length}
          onClick={() => {
            const fresh = filtered.filter(
              (p) => p.id !== problem?.id && p.status !== 'examples_passed',
            );
            const choices = fresh.length ? fresh : filtered.filter((p) => p.id !== problem?.id);
            if (choices.length) void open(choices[Math.floor(Math.random() * choices.length)].id);
          }}
        >
          Random problem
        </button>
      </div>
      <div className="practice-layout">
        <aside aria-label="Problem library">
          <p>{filtered.length} matching problems</p>
          <ul>
            {filtered.map((p) => (
              <li key={p.id}>
                <button
                  disabled={busy || !!run.status}
                  aria-current={problem?.id === p.id ? 'true' : undefined}
                  onClick={() => void open(p.id)}
                >
                  <strong>{p.title}</strong>
                  <span>
                    {p.topic} · {p.difficulty}
                    {p.status === 'examples_passed' ? ' · Examples passed' : ''}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {!filtered.length && <p>No problems match these filters.</p>}
        </aside>
        {problem ? (
          <section className="practice-workspace" key={problem.id}>
            <div className="workspace-tabs" aria-label="Practice views">
              {(['problem', 'editorial', 'history'] as const).map((t) => (
                <button
                  key={t}
                  aria-pressed={panel === t}
                  disabled={busy || !!run.status}
                  onClick={() => void showPanel(t)}
                >
                  {t === 'problem'
                    ? 'Problem'
                    : t === 'editorial'
                      ? 'Editorial'
                      : 'Attempt history'}
                </button>
              ))}
            </div>
            <SplitPane
              label="Resize problem and editor"
              first={
                <div className="practice-statement">
                  <h2>{problem.title}</h2>
                  <p>
                    {problem.topic} · {problem.difficulty}
                  </p>
                  {panel === 'problem' ? (
                    <>
                      <p>{problem.statement}</p>
                      <h3>Input</h3>
                      <p>{problem.inputFormat}</p>
                      <h3>Output</h3>
                      <p>{problem.outputFormat}</p>
                      <h3>Constraints</h3>
                      <ul>
                        {problem.constraints.map((c) => (
                          <li key={c}>{c}</li>
                        ))}
                      </ul>
                      <div className="case-tabs" aria-label="Problem examples">
                        {problem.examples.map((e, i) => (
                          <button
                            key={i}
                            aria-pressed={caseInput === i}
                            onClick={() => setCaseInput(i)}
                          >
                            Example {i + 1}
                          </button>
                        ))}
                      </div>
                      <article>
                        <h3>Example {caseInput + 1}</h3>
                        <label>Input</label>
                        <pre>{problem.examples[caseInput].input}</pre>
                        <label>Output</label>
                        <pre>{problem.examples[caseInput].output}</pre>
                        {problem.examples[caseInput].explanation && (
                          <p>{problem.examples[caseInput].explanation}</p>
                        )}
                      </article>
                    </>
                  ) : panel === 'editorial' ? (
                    editorial ? (
                      <>
                        <h3>Reference approach</h3>
                        <p>{editorial.explanation}</p>
                        <p>Reference time: {editorial.timeComplexity}</p>
                        <p>Reference space: {editorial.spaceComplexity}</p>
                        <details>
                          <summary>Show reference Python solution</summary>
                          <pre>{editorial.code}</pre>
                        </details>
                      </>
                    ) : (
                      <p>{busy ? 'Loading editorial…' : 'Editorial unavailable.'}</p>
                    )
                  ) : (
                    <>
                      <h3>Your local attempts</h3>
                      <p>
                        The latest 50 example runs for this problem. Results are reported by your
                        browser and remain unverified. Custom runs are not saved.
                      </p>
                      {attempts.length === 0 && (
                        <p>{busy ? 'Loading history…' : 'No saved attempts yet.'}</p>
                      )}
                      {attempts.map((a) => {
                        const r = JSON.parse(a.results_json) as Pick<
                          LocalResult,
                          'verdict' | 'runtimeMs'
                        >[];
                        return (
                          <article key={a.id}>
                            <strong>
                              {r.filter((v) => v.verdict === 'PASS').length}/
                              {problem.examples.length} examples passed · unverified
                            </strong>
                            <p>
                              {new Date(a.created_at).toLocaleString()} ·{' '}
                              {a.execution_mode === 'function' ? 'Function' : 'Script'}
                            </p>
                            <p>{r.map((v) => v.verdict).join(' · ')}</p>
                            <button
                              className="button secondary"
                              disabled={busy || !!run.status}
                              onClick={() => void restore(a.id)}
                            >
                              Load this code
                            </button>
                          </article>
                        );
                      })}
                    </>
                  )}
                </div>
              }
              second={
                <SplitPane
                  vertical
                  label="Resize editor and results"
                  first={
                    <div className="practice-editor">
                      <div className="practice-mode">
                        <span>Python 3</span>
                        {problem.matchEligible === false && (
                          <label>
                            Code format
                            <select
                              aria-label="Code format"
                              value={mode}
                              disabled={busy || !!run.status}
                              onChange={(e) => {
                                const next = e.target.value as ExecutionMode;
                                if (
                                  source !== baseline &&
                                  !window.confirm(
                                    'Change code format and replace the unsaved draft?',
                                  )
                                )
                                  return;
                                setMode(next);
                                setSource(
                                  next === 'function' ? FUNCTION_STARTER : problem.starterCode,
                                );
                                run.reset();
                              }}
                            >
                              <option value="function">solve(data) function</option>
                              <option value="script">Full stdin/stdout script</option>
                            </select>
                          </label>
                        )}
                      </div>
                      <div className="practice-monaco">
                        <Suspense fallback={<p>Loading editor…</p>}>
                          <CodeEditor
                            value={source}
                            onChange={setSource}
                            disabled={busy || !!run.status}
                          />
                        </Suspense>
                      </div>
                    </div>
                  }
                  second={
                    <div className="runner-console">
                      <div className="practice-actions">
                        <button
                          className="button primary"
                          disabled={busy || !!run.status}
                          onClick={() => void check()}
                        >
                          Run examples
                        </button>
                        <button
                          className="button secondary"
                          disabled={busy || !!run.status}
                          onClick={() => void save()}
                        >
                          Save draft
                        </button>
                        <p role="status">{saved}</p>
                      </div>
                      <p>
                        {mode === 'function'
                          ? 'Implement solve(data) and return the answer. Input parsing and JSON output are handled by the runner.'
                          : 'Read stdin and print the answer using the problem format.'}
                      </p>
                      <div className="case-tabs">
                        <button
                          aria-pressed={consoleTab === 'examples'}
                          onClick={() => setConsoleTab('examples')}
                        >
                          Example runs
                        </button>
                        <button
                          aria-pressed={consoleTab === 'custom'}
                          onClick={() => setConsoleTab('custom')}
                        >
                          Custom input
                        </button>
                      </div>
                      {consoleTab === 'custom' && (
                        <CustomRun
                          run={run}
                          source={executableSource(source, mode)}
                          disabled={busy}
                        />
                      )}
                      <PythonResults run={run} />
                    </div>
                  }
                />
              }
            />
          </section>
        ) : (
          <section className="empty-state">
            <h2>Choose your next problem</h2>
            <p>
              Browse the library or pick a random challenge. These are original CodeClash tasks; see
              the NeetCode roadmap for related interview topics.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
