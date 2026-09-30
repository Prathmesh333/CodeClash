// Boots a real local Worker (Durable Objects + D1 + Worker static assets) on a private port with
// its own throwaway persistence directory, so integration tests exercise real routing, real
// Durable Object lifecycles, real hibernation and real SQL triggers. Nothing is mocked.
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Snapshot } from '../../packages/protocol';

const CONFIG = 'apps/worker/wrangler.integration.jsonc';
const pause = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const readJsonc = async (path: string) => JSON.parse((await readFile(path, 'utf8')).replace(/^\s*\/\/.*$/gm, ''));

export type Session = { id: string; cookie: string };
export type Arena = {
  base: string;
  state: string;
  signIn: (id: string) => Promise<Session>;
  call: (session: Session | null, path: string, data?: unknown, headers?: Record<string, string>) => Promise<{ status: number; body: any }>;
  stop: () => Promise<void>;
};

const freePort = () => 8800 + Math.floor(Math.random() * 180);

export async function startArena(): Promise<Arena> {
  await mkdir('work', { recursive: true });
  // The integration config duplicates the base config on purpose; fail loudly rather than testing a
  // topology that no longer matches the local Worker.
  const baseConfig = await readJsonc('apps/worker/wrangler.jsonc');
  const integration = await readJsonc(CONFIG);
  for (const key of ['main', 'compatibility_date', 'compatibility_flags', 'd1_databases', 'durable_objects', 'migrations']) {
    if (JSON.stringify(baseConfig[key]) !== JSON.stringify(integration[key])) {
      throw new Error(`${CONFIG} "${key}" has drifted from apps/worker/wrangler.jsonc`);
    }
  }
  const state = await mkdtemp(resolve('work/integration-state-'));
  const port = freePort();
  const base = `http://127.0.0.1:${port}`;
  const run = (args: string[]) => {
    const result = spawnSync(process.execPath, args, { stdio: 'pipe', encoding: 'utf8' });
    if (result.status !== 0) throw new Error(`setup failed: ${args.join(' ')}\n${result.stdout}\n${result.stderr}`);
  };
  run(['node_modules/wrangler/bin/wrangler.js', 'd1', 'migrations', 'apply', 'DB', '--local', '--config', CONFIG, '--persist-to', state]);
  run(['scripts/seed.mjs', '--config', CONFIG, '--persist-to', state]);
  // Every test gets its own accounts so a leftover ticket or match can never leak between tests.
  const extraUsers = Array.from({ length: 32 }, (_, index) => {
    const id = `player-${String(index + 1).padStart(2, '0')}`;
    return `INSERT OR IGNORE INTO users(id,auth_subject,username,created_at) VALUES ('${id}','local:${id}','Player ${String(index + 1).padStart(2, '0')}',0);`;
  }).join('\n');
  const extraFile = resolve(state, 'extra-users.sql');
  await writeFile(extraFile, extraUsers + '\n');
  run(['node_modules/wrangler/bin/wrangler.js', 'd1', 'execute', 'DB', '--local', '--config', CONFIG, '--persist-to', state, '--file', extraFile]);
  const logs: string[] = [];
  const logFile = resolve('work', `integration-worker-${port}.log`);
  const record = (chunk: unknown) => { logs.push(String(chunk)); appendFileSync(logFile, String(chunk)); };
  const worker: ChildProcess = spawn(process.execPath, [
    'node_modules/wrangler/bin/wrangler.js', 'dev', '--config', CONFIG,
    '--port', String(port), '--ip', '127.0.0.1', '--persist-to', state,
    '--var', `APP_ORIGIN:${base}`,
  ], { stdio: ['ignore', 'pipe', 'pipe'] });
  worker.stdout?.on('data', record);
  worker.stderr?.on('data', record);

  const stop = async () => {
    worker.kill();
    await pause(300);
  };
  const healthy = async () => {
    try {
      const response = await fetch(base + '/api/health', { signal: AbortSignal.timeout(2000) });
      return response.ok;
    } catch { return false; }
  };
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (await healthy()) break;
    if (worker.exitCode !== null) throw new Error(`worker exited early:\n${logs.join('')}`);
    await pause(500);
  }
  if (!(await healthy())) {
    await stop();
    throw new Error(`worker never became healthy on ${base}:\n${logs.join('')}`);
  }

  // Local workerd occasionally drops a proxied connection. A dropped connection is not an
  // application answer, so retry it; a real status code is never retried.
  const withRetry = async <T,>(label: string, send: () => Promise<T>): Promise<T> => {
    for (let attempt = 0; ; attempt += 1) {
      try { return await send(); }
      catch (error) {
        const name = (error as Error)?.name;
        if ((name !== 'TypeError' && name !== 'TimeoutError' && name !== 'AbortError') || attempt >= 2) throw error;
        logs.push(`transport failure on ${label}: ${(error as Error).message}\n`);
        await pause(250 * (attempt + 1));
      }
    }
  };

  const call: Arena['call'] = async (session, path, data, headers = {}) => withRetry(path, async () => {
    const response = await fetch(base + '/api' + path, {
      method: data === undefined ? 'GET' : 'POST',
      headers: {
        ...(session ? { Cookie: session.cookie } : {}),
        Origin: base,
        ...(data === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...headers,
      },
      body: data === undefined ? undefined : JSON.stringify(data),
      signal: AbortSignal.timeout(15000),
    });
    const text = await response.text();
    try { return { status: response.status, body: text ? JSON.parse(text) : {} }; }
    catch {
      // A body that is not the documented API shape is a transport or proxy failure, not an answer.
      const error = new Error(`unexpected response body: ${text.slice(0, 80)}`) as Error & { name: string };
      error.name = 'TypeError';
      throw error;
    }
  });

  const signIn: Arena['signIn'] = async id => withRetry(`sign-in ${id}`, async () => {
    const response = await fetch(base + '/api/auth/local', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: base },
      body: JSON.stringify({ id }),
      signal: AbortSignal.timeout(15000),
    });
    const text = await response.text();
    if (!response.ok) {
      const error = new Error(`sign-in failed for ${id}: ${response.status} ${text.slice(0, 120)}`) as Error & { name: string };
      // Only a server-side failure may be transient; a 4xx is the authoritative answer.
      error.name = response.status >= 500 ? 'TypeError' : 'AuthError';
      throw error;
    }
    const cookie = (response.headers.getSetCookie()[0] ?? '').split(';')[0];
    if (!cookie.startsWith('rdsa_session=')) throw new Error(`sign-in for ${id} returned no session cookie`);
    return { id, cookie };
  });

  return { base, state, signIn, call, stop };
}

/** Runs both players through queue -> ready and returns the shared match id. */
export async function pairUp(arena: Arena, a: Session, b: Session) {
  await arena.call(a, '/matchmaking/join', {});
  const joined = await arena.call(b, '/matchmaking/join', {});
  if (!joined.body.matchId) throw new Error(`players were not paired: ${JSON.stringify(joined.body)}`);
  await arena.call(a, `/match/${joined.body.matchId}/ready`, {});
  const ready = await arena.call(b, `/match/${joined.body.matchId}/ready`, {});
  return { matchId: joined.body.matchId as string, snapshot: ready.body as Snapshot };
}

/** Polls until the room satisfies `done`, using only the authoritative snapshot endpoint. */
export async function waitFor(arena: Arena, session: Session, matchId: string, done: (snapshot: Snapshot) => boolean, timeoutMs = 20000): Promise<Snapshot> {
  const deadline = Date.now() + timeoutMs;
  let latest: Snapshot | undefined;
  while (Date.now() < deadline) {
    const response = await arena.call(session, `/match/${matchId}`);
    latest = response.body as Snapshot;
    if (done(latest)) return latest;
    await pause(250);
  }
  throw new Error(`match ${matchId} never satisfied the condition; last phase=${latest?.phase} problem=${latest?.problem?.id ?? 'none'}`);
}

/** Reads the read-only evidence projection: invariant counters plus the rows tests assert on. */
export async function testState(arena: Arena): Promise<Evidence> {
  const response = await arena.call(null, '/test/state');
  if (response.status !== 200) throw new Error(`evidence endpoint returned ${response.status}: ${JSON.stringify(response.body)}`);
  return response.body as Evidence;
}

export type Evidence = {
  ok: boolean;
  environment: string;
  judgeConfigured: boolean;
  invariants: Record<string, number>;
  users: { id: string; rating: number; games_played: number; wins: number; losses: number; draws: number; rating_version: number }[];
  matches: { id: string; problem_id: string; mode: string; player_a: string; player_b: string; created_at: number; finished_at: number | null; outcome_json: string | null }[];
  submissions: { id: string; match_id: string; user_id: string; idempotency_key: string; kind: string; verdict: string; receipt_ms: number; receipt_seq: number; runtime_ms: number | null }[];
  settlements: { match_id: string; rated: number; a: string; b: string; rating_a: number; rating_b: number; delta_a: number; score_a: number; digest: string }[];
  ratingEvents: { match_id: string; user_id: string; rating_before: number; delta: number; rating_after: number }[];
};

