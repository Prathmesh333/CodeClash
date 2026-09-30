// Serves the browser suite from one origin: a real local Worker with D1, Durable Objects and
// the built frontend as Worker static assets. No dev proxy sits between the browser and the API.
import { spawn, spawnSync } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdir, mkdtemp, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const PORT = Number(process.env.E2E_PORT ?? 8790);
const BASE = `http://127.0.0.1:${PORT}`;
const CONFIG = 'apps/worker/wrangler.e2e.jsonc';

const readJsonc = async (path) => JSON.parse((await readFile(path, 'utf8')).replace(/^\s*\/\/.*$/gm, ''));

// The e2e config duplicates the base config on purpose; fail loudly instead of testing a
// topology that no longer matches the local Worker.
const [base, e2e] = await Promise.all([readJsonc('apps/worker/wrangler.jsonc'), readJsonc(CONFIG)]);
for (const key of ['main', 'compatibility_date', 'compatibility_flags', 'd1_databases', 'durable_objects', 'migrations']) {
  if (JSON.stringify(base[key]) !== JSON.stringify(e2e[key])) {
    console.error(`BLOCKED: ${CONFIG} "${key}" has drifted from apps/worker/wrangler.jsonc.`);
    process.exit(2);
  }
}
if (!existsSync(resolve('apps/web/index.html'))) {
  console.error('BLOCKED: apps/web/index.html is missing.');
  process.exit(2);
}

await mkdir('work', { recursive: true });
const state = await mkdtemp(resolve('work/e2e-state-'));
const run = (args) => { const r = spawnSync(process.execPath, args, { stdio: 'inherit' }); if (r.status !== 0) process.exit(r.status ?? 1); };
// Always rebuild so the browser suite can never run against a stale bundle.
run(['node_modules/vite/bin/vite.js', 'build', '--config', 'apps/web/vite.config.ts']);
run(['node_modules/wrangler/bin/wrangler.js', 'd1', 'migrations', 'apply', 'DB', '--local', '--config', CONFIG, '--persist-to', state]);
run(['scripts/seed.mjs', '--config', CONFIG, '--persist-to', state]);
// Mirror the Worker output into work/ so a failing browser run can be diagnosed after the fact.
const log = createWriteStream(resolve('work', 'e2e-worker.log'), { flags: 'w' });
const worker = spawn(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'dev', '--config', CONFIG, '--port', String(PORT), '--ip', '127.0.0.1', '--persist-to', state, '--var', `APP_ORIGIN:${BASE}`, '--var', `CASUAL_WASM:${process.env.CASUAL_E2E === 'true'}`], { stdio: ['ignore', 'pipe', 'pipe'] });
for (const stream of [worker.stdout, worker.stderr]) stream?.on('data', chunk => { log.write(chunk); process.stdout.write(chunk); });
function stop() { worker.kill(); process.exit(); }
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
worker.on('exit', (code) => { if (code) process.exit(code ?? 1); });
