import workerSource from './worker.js?raw';
import { normalizeOutput } from '../../../../packages/shared/game';
export const PYTHON_VERSION = '314.0.7';
export type Example = { input: string; output: string };
export type LocalResult = {
  verdict: 'PASS' | 'WA' | 'RE' | 'TLE' | 'OLE';
  output: string;
  error: string;
  runtimeMs: number;
  expected: string;
};
export type Progress = (message: string) => void;

function runOne(
  source: string,
  input: string,
  signal: AbortSignal,
  progress: Progress,
): Promise<Omit<LocalResult, 'expected'>> {
  return new Promise((resolve, reject) => {
    const frame = document.createElement('iframe');
    frame.hidden = true;
    frame.title = 'Isolated Python runner';
    frame.sandbox.add('allow-scripts');
    const channel = new MessageChannel();
    const runtime = new URL(`/python-runtime/${PYTHON_VERSION}/`, location.origin).href;
    let finished = false,
      started = false,
      timer: ReturnType<typeof setTimeout>;
    const cleanup = () => {
      finished = true;
      clearTimeout(timer);
      signal.removeEventListener('abort', abort);
      channel.port1.close();
      frame.remove();
    };
    const abort = () => {
      if (finished) return;
      cleanup();
      reject(new DOMException('Run stopped.', 'AbortError'));
    };
    const fail = (message: string) => {
      if (finished) return;
      cleanup();
      reject(new Error(message));
    };
    if (signal.aborted) {
      abort();
      return;
    }
    signal.addEventListener('abort', abort, { once: true });
    timer = setTimeout(
      () => fail('Python download timed out. Check your connection and retry.'),
      60000,
    );
    // The iframe has an opaque origin; its blob Worker inherits this restrictive CSP.
    // Runtime assets are the only permitted network destination. No same-origin flag.
    const csp = `default-src 'none'; script-src 'unsafe-inline' 'wasm-unsafe-eval' blob: ${runtime}; worker-src blob:; connect-src ${runtime}; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'`;
    const bootstrap = `addEventListener('message',function start(event){if(event.source!==parent||!event.ports[0])return;removeEventListener('message',start);const port=event.ports[0];const worker=new Worker(URL.createObjectURL(new Blob([${JSON.stringify(workerSource).replace(/</g, '\\u003c')}],{type:'text/javascript'})));worker.onmessage=e=>port.postMessage(e.data);worker.onerror=()=>port.postMessage({type:'failure',error:'Python runtime failed to start.'});worker.postMessage(event.data);});`;
    frame.srcdoc = `<!doctype html><meta http-equiv="Content-Security-Policy" content="${csp}"><script>${bootstrap}</script>`;
    channel.port1.onmessage = ({ data }) => {
      if (finished || !data || typeof data !== 'object') return;
      if (data.type === 'ready' && !started) {
        started = true;
        progress('Running example…');
        clearTimeout(timer);
        timer = setTimeout(() => {
          if (finished) return;
          cleanup();
          resolve({
            verdict: 'TLE',
            output: '',
            error: 'Stopped after the 5-second execution limit.',
            runtimeMs: 5000,
          });
        }, 5000);
      } else if (data.type === 'failure')
        fail('Python could not load. Check your connection and retry.');
      else if (data.type === 'result') {
        if (
          !['OK', 'RE', 'OLE'].includes(data.verdict) ||
          typeof data.output !== 'string' ||
          typeof data.error !== 'string'
        ) {
          fail('Invalid local execution result.');
          return;
        }
        const result = {
          verdict: (data.verdict === 'OK' ? 'PASS' : data.verdict) as LocalResult['verdict'],
          output: data.output.slice(0, 16384),
          error: data.error.slice(0, 16384),
          runtimeMs: Number.isFinite(data.runtimeMs)
            ? Math.max(0, Math.min(5000, data.runtimeMs))
            : 0,
        };
        cleanup();
        resolve(result);
      }
    };
    frame.onload = () => {
      if (!finished)
        frame.contentWindow?.postMessage({ source, input, runtime }, '*', [channel.port2]);
    };
    document.body.appendChild(frame);
  });
}

export async function runExamples(
  source: string,
  examples: Example[],
  signal: AbortSignal,
  progress: Progress,
): Promise<LocalResult[]> {
  if (new TextEncoder().encode(source).length > 65536)
    throw new Error('Code must be at most 64 KiB.');
  if (!source.trim()) throw new Error('Write some Python code first.');
  if (!examples.length || examples.length > 20)
    throw new Error('Choose between 1 and 20 public examples.');
  const results: LocalResult[] = [];
  for (const [i, example] of examples.entries()) {
    if (new TextEncoder().encode(example.input).length > 65536)
      throw new Error('Example input is too large.');
    progress(`Loading Python · example ${i + 1}/${examples.length}…`);
    const result = await runOne(source, example.input, signal, progress);
    results.push({
      ...result,
      verdict:
        result.verdict === 'PASS' &&
        normalizeOutput(result.output) !== normalizeOutput(example.output)
          ? 'WA'
          : result.verdict,
      expected: example.output,
    });
    if (result.verdict === 'TLE' || result.verdict === 'OLE') break;
  }
  return results;
}
