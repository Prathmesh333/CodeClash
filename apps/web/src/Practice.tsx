import { lazy, Suspense, useEffect, useState } from 'react';
import { api } from './api';
import { usePythonRun, PythonResults } from './python/usePythonRun';
import './practice.css';
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
      source !== problem.starterCode &&
      !window.confirm('Open another problem? Save your current draft first if you want to keep it.')
    )
      return;
    setBusy(true);
    setError('');
    try {
      const v = await api<{ problem: Problem; progress: { source: string } | null }>(
        '/practice/' + id,
      );
      run.reset();
      setProblem(v.problem);
      setSource(v.progress?.source ?? v.problem.starterCode);
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
      await api('/practice/' + problem.id, { source, status });
      setSaved(
        status === 'examples_passed' ? 'Examples passed · saved (unverified)' : 'Draft saved',
      );
      setCatalog((c) => c.map((p) => (p.id === problem.id ? { ...p, status } : p)));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function check() {
    if (!problem) return;
    setError('');
    const results = await run.run(source, problem.examples);
    if (results?.length === problem.examples.length && results.every((r) => r.verdict === 'PASS'))
      await save('examples_passed');
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
          <select aria-label="Difficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
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
            <div className="practice-statement">
              <h2>{problem.title}</h2>
              <p>
                {problem.topic} · {problem.difficulty}
              </p>
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
              {problem.examples.map((e, i) => (
                <article key={i}>
                  <h3>Example {i + 1}</h3>
                  <pre>{e.input}</pre>
                  <pre>{e.output}</pre>
                  {e.explanation && <p>{e.explanation}</p>}
                </article>
              ))}
            </div>
            <div className="practice-editor">
              <Suspense fallback={<p>Loading editor…</p>}>
                <CodeEditor value={source} onChange={setSource} disabled={busy || !!run.status} />
              </Suspense>
            </div>
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
            <PythonResults run={run} />
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
