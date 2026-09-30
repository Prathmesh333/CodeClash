// Runs only in a disposable Worker owned by an opaque-origin sandboxed iframe.
// No credentials, hidden tests, or application bindings are passed here.
self.onmessage = async ({ data }) => {
  const send = self.postMessage.bind(self);
  try {
    importScripts(data.runtime + 'pyodide.js');
    const py = await loadPyodide({ indexURL: data.runtime, jsglobals: Object.create(null) });
    let output = '',
      error = '',
      size = 0,
      exceeded = false;
    const decoders = { out: new TextDecoder(), err: new TextDecoder() };
    const write = (which) => (bytes) => {
      size += bytes.length;
      if (size > 16384) {
        exceeded = true;
        throw new Error('Output limit exceeded');
      }
      const text = decoders[which].decode(bytes, { stream: true });
      if (which === 'out') output += text;
      else error += text;
      return bytes.length;
    };
    py.setStdout({ write: write('out') });
    py.setStderr({ write: write('err') });
    const input = new TextEncoder().encode(data.input);
    let offset = 0;
    py.setStdin({
      read: (buffer) => {
        const n = Math.min(buffer.length, input.length - offset);
        buffer.set(input.subarray(offset, offset + n));
        offset += n;
        return n;
      },
    });
    send({ type: 'ready' });
    const started = performance.now();
    let verdict = 'OK';
    const globals = py.toPy({ __name__: '__main__', source: data.source });
    try {
      const result = py.runPython(
        `
try:
    exec(compile(source, "solution.py", "exec"), {"__name__": "__main__"})
except SystemExit as exit:
    if exit.code is not None and exit.code != 0:
        raise
`,
        { globals },
      );
      if (result?.destroy) result.destroy();
    } catch (e) {
      verdict = exceeded ? 'OLE' : 'RE';
      error = (error + '\n' + String(e)).slice(0, 16384);
    } finally {
      try {
        py.runPython('import sys; sys.stdout.flush(); sys.stderr.flush()');
      } catch (e) {
        verdict = exceeded ? 'OLE' : 'RE';
        error = (error + '\n' + String(e)).slice(0, 16384);
      }
      globals.destroy();
    }
    if (exceeded) verdict = 'OLE';
    output += decoders.out.decode();
    error += decoders.err.decode();
    send({
      type: 'result',
      verdict,
      output: output.slice(0, 16384),
      error: error.slice(0, 16384),
      runtimeMs: Math.round(performance.now() - started),
    });
  } catch {
    send({ type: 'failure', error: 'Python could not load. Check your connection and try again.' });
  }
};
