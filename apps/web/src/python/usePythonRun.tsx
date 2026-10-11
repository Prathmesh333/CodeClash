import { useEffect, useRef, useState, useId } from 'react';
import { runExamples, type Example, type LocalResult } from './runner';
export function usePythonRun() {
  const [results, setResults] = useState<LocalResult[]>([]),
    [status, setStatus] = useState(''),
    [error, setError] = useState('');
  const controller = useRef<AbortController | null>(null),
    generation = useRef(0);
  useEffect(
    () => () => {
      generation.current++;
      controller.current?.abort();
    },
    [],
  );
  async function run(source: string, examples: Example[], compare = true) {
    if (controller.current) return;
    const token = ++generation.current,
      abort = new AbortController();
    controller.current = abort;
    setResults([]);
    setError('');
    setStatus('Loading Python…');
    try {
      const results = await runExamples(
        source,
        examples,
        abort.signal,
        (message) => {
          if (generation.current === token) setStatus(message);
        },
        compare,
      );
      if (generation.current === token) {
        setResults(results);
        return results;
      }
    } catch (e) {
      if (generation.current === token)
        setError((e as Error).name === 'AbortError' ? 'Run stopped.' : (e as Error).message);
    } finally {
      if (generation.current === token) {
        controller.current = null;
        setStatus('');
      }
    }
  }
  const reset = () => {
    generation.current++;
    controller.current?.abort();
    controller.current = null;
    setResults([]);
    setError('');
    setStatus('');
  };
  return { results, status, error, run, reset, stop: () => controller.current?.abort() };
}
export function PythonResults({ run }: { run: ReturnType<typeof usePythonRun> }) {
  const uid = useId();
  const [selected, setSelected] = useState(0);
  const index = Math.min(selected, Math.max(0, run.results.length - 1));
  const result = run.results[index];
  const verdictLabel = (r: LocalResult) =>
    r.verdict === 'PASS'
      ? r.compared
        ? 'Passed'
        : 'Finished'
      : r.verdict === 'WA'
        ? 'Wrong answer'
        : r.verdict === 'TLE'
          ? 'Time limit'
          : r.verdict === 'OLE'
            ? 'Output limit'
            : 'Runtime error';
  return (
    <section className="local-results" aria-label="Local Python results">
      <h3>Local Python results · unverified</h3>
      <p>
        Runs on your device. Each case has a five-second limit and a 16 KiB output limit. First use
        downloads Python. Device timings are diagnostic and do not affect ratings.
      </p>
      {run.status && (
        <p role="status">
          {run.status}{' '}
          <button className="text-button" onClick={run.stop}>
            Stop run
          </button>
        </p>
      )}
      {run.error && <p role="alert">{run.error}</p>}
      {run.results.length > 0 && (
        <div className="case-tabs" role="tablist" aria-label="Execution cases">
          {run.results.map((r, i) => (
            <button
              key={i}
              role="tab"
              id={`${uid}-case-${i}`}
              aria-selected={index === i}
              aria-controls={`${uid}-panel`}
              tabIndex={index === i ? 0 : -1}
              onClick={() => setSelected(i)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                  e.preventDefault();
                  const next =
                    (i + (e.key === 'ArrowRight' ? 1 : -1) + run.results.length) %
                    run.results.length;
                  setSelected(next);
                  (e.currentTarget.parentElement?.children[next] as HTMLButtonElement)?.focus();
                }
              }}
            >
              {r.compared ? `Example ${i + 1}` : 'Custom input'} · {verdictLabel(r)}
            </button>
          ))}
        </div>
      )}
      {result && (
        <article
          className="submission"
          role="tabpanel"
          id={`${uid}-panel`}
          aria-labelledby={`${uid}-case-${index}`}
        >
          <strong>
            {result.compared ? `Example ${index + 1}` : 'Custom input'}: {verdictLabel(result)}
          </strong>
          <p>{Math.round(result.runtimeMs)} ms on this device</p>
          <label>Input</label>
          <pre>{result.input || '(empty input)'}</pre>
          <label>Output</label>
          <pre>{result.output || '(no output)'}</pre>
          {result.error && (
            <>
              <p role="alert">{summarizePythonError(result.error)}</p>
              <details>
                <summary>Full traceback</summary>
                <pre>{result.error}</pre>
              </details>
            </>
          )}
          {result.compared && (
            <>
              <label>Expected</label>
              <pre>{result.expected}</pre>
            </>
          )}
        </article>
      )}
    </section>
  );
}
export function summarizePythonError(error: string) {
  const lines = error.split('\n');
  const message = [...lines]
    .reverse()
    .find((line) => /^[A-Za-z]+(?:Error|Exception):/.test(line.trim()));
  const location = [...error.matchAll(/File "solution.py", line (\d+)/g)].at(-1)?.[1];
  return `${location ? `Line ${location}: ` : ''}${message?.trim() ?? error.slice(0, 250)}`;
}
