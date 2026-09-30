import { useEffect, useRef, useState } from 'react';
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
  async function run(source: string, examples: Example[]) {
    if (controller.current) return;
    const token = ++generation.current,
      abort = new AbortController();
    controller.current = abort;
    setResults([]);
    setError('');
    setStatus('Loading Python…');
    try {
      const results = await runExamples(source, examples, abort.signal, (message) => {
        if (generation.current === token) setStatus(message);
      });
      if (generation.current === token) setResults(results);
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
  return { results, status, error, run, stop: () => controller.current?.abort() };
}
export function PythonResults({ run }: { run: ReturnType<typeof usePythonRun> }) {
  return (
    <section className="local-results" aria-label="Local Python results">
      <h3>Local examples · unverified</h3>
      <p>
        Runs on your device. No rating change. First use downloads Python; later runs use cached
        files. Each example has a five-second limit and a 16 KiB output limit.
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
      {run.results.map((result, i) => (
        <article className="submission" key={i}>
          <strong>{`Example ${i + 1}: ${result.verdict === 'PASS' ? 'Passed' : result.verdict === 'WA' ? 'Wrong answer' : result.verdict === 'TLE' ? 'Time limit' : result.verdict === 'OLE' ? 'Output limit' : 'Runtime error'}`}</strong>
          <pre>{result.output || '(no output)'}</pre>
          {result.error && <pre>{result.error}</pre>}
          {result.verdict === 'WA' && (
            <>
              <span>Expected</span>
              <pre>{result.expected}</pre>
            </>
          )}
        </article>
      ))}
    </section>
  );
}
