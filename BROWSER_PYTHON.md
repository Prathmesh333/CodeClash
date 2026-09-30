# Browser Python execution

## Behavior

- **Run:** executes the revealed public examples on the player’s device. Results are marked local and unverified. No execution API request, database write, rating update, or hidden test download occurs.
- **Submit:** sends source to the existing server judge. Only server results can decide a match.
- Python only. Uses the pinned Pyodide 314.0.7 runtime, with Python’s bundled standard library. Additional package downloads and other languages are not supported.
- First use transfers about 13.5 MB before HTTP compression. Later runs can reuse the browser cache. Assets are served from this site; no runtime CDN dependency.

## Local development

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Join a match using two browser profiles, ready both players, write Python and select Run. Docker is not required for Run. The Vite configuration copies the pinned runtime from node_modules into a generated, ignored public directory before development or builds. Keep devDependencies installed during the build.

## Execution boundaries

Each example gets a fresh interpreter, virtual filesystem, worker and sandboxed iframe. Examples run sequentially. The iframe permits scripts but has an opaque origin (no allow-same-origin). Its CSP permits only bundled runtime network resources and blocks application APIs and external destinations. Runtime assets alone have permissive CORS; account APIs retain their existing origin restrictions. No session, hidden test or server binding is given to Python. The JS bridge starts with an empty globals object.

The parent owns the deadline and destroys the frame on completion, failure, cancellation or component unmount. A worker loop cannot block React or the match WebSocket. Execution is single-threaded; this is not physical CPU-core pinning. Browsers do not provide a reliable per-run hard RAM limit: a memory-heavy program can still exhaust a tab’s resources. Treat this as local practice isolation, never as a trusted ranked judge.

Limits:

- Source and each example input: 64 KiB.
- Examples: 1–20, evaluated sequentially.
- Runtime initialization: 60 seconds per example.
- Execution: five seconds per example, controlled outside the Python worker.
- Combined stdout/stderr: 16 KiB; output overflow ends the example.
- Stop ends the current batch. Infinite loops and output overflow stop subsequent examples.

Timing measures vary by device and browser load. Do not compare these timings between players or infer Big-O complexity from one run. Public examples can be hardcoded, local verdicts can be forged, and sending private tests to a browser would expose them. This design deliberately keeps ranked verification on the server.

## Verification

```sh
pnpm typecheck
pnpm test:unit
pnpm test:e2e
pnpm build
```

The real-browser multiplayer test exercises the shipped WASM runtime: public-example passes, wrong answers, syntax errors, restricted JS globals, output overflow, infinite-loop timeout, cancellation, fresh filesystem, Unicode output, and continued live connection. It checks that Run makes no run/submit API request, then checks that Submit still reports an unavailable server judge honestly.

Verified locally on 2026-09-29: TypeScript checks passed; 31 unit tests, 17 backend integration tests and all 3 browser tests passed. The final browser run included output without a trailing newline and normal/nonzero Python exits. Its build included all five runtime assets. Cloudflare deployment was not performed.

Before release:

- [ ] Validate on Firefox, Safari, mobile devices and low-memory hardware (current automated coverage is Chromium).
- [ ] Verify runtime asset CORS and MIME types on Cloudflare staging.
- [ ] Enable and independently verify the isolated server judge before accepting ranked solutions.
- [ ] Run the existing repeated 100-fake-player simulation gate with the real judge. Browser Run does not replace this gate.

## Deployment and cost

`pnpm build` includes the runtime in dist/web; existing Workers static assets deployment serves it. Run removes per-example server execution work. It does not make matchmaking, persistence or ranked submissions automatically free. No cloud resources or billing plans were changed for this implementation.

Runtime source and licensing: [Pyodide](https://github.com/pyodide/pyodide/tree/314.0.7), MPL-2.0; the distribution also contains CPython and its standard library with their respective licenses. Preserve upstream notices when updating the runtime.
