import { expect, it, vi } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
vi.mock('cloudflare:workers', () => ({ DurableObject: class {} }));
import worker from '../../apps/worker/src/index';
import { body, hash, rateLimit, type Env } from '../../apps/worker/src/env';

function fixture() {
  const db = new DatabaseSync(':memory:');
  for (const file of [
    '0001_initial.sql',
    '0002_submissions.sql',
    '0003_email_login.sql',
    '0004_profiles.sql',
    '0005_privacy_requests.sql',
  ])
    db.exec(readFileSync('database/migrations/' + file, 'utf8'));
  const env = {
    APP_ENV: 'staging',
    APP_ORIGIN: 'https://code-clash.com',
    ASSETS: {
      fetch: async () =>
        new Response('<html><head></head><body>App</body></html>', {
          headers: { 'Content-Type': 'text/html' },
        }),
    },
    DB: {
      prepare(sql: string) {
        let args: any[] = [];
        return {
          bind(...values: any[]) {
            args = values;
            return this;
          },
          async first() {
            return db.prepare(sql).get(...args) ?? null;
          },
          async run() {
            return db.prepare(sql).run(...args);
          },
          async all() {
            return { results: db.prepare(sql).all(...args) };
          },
        };
      },
    },
  } as unknown as Env;
  return { db, env };
}
it('limits concurrent requests atomically without storing identifiers in plaintext', async () => {
  const { db, env } = fixture();
  const results = await Promise.allSettled(
    Array.from({ length: 10 }, () => rateLimit(env, 'user@example.com', 3, 60000)),
  );
  expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(3);
  expect(db.prepare('SELECT key,count FROM auth_rate_limits').get()).toMatchObject({ count: 3 });
  expect(JSON.stringify(db.prepare('SELECT * FROM auth_rate_limits').all())).not.toContain(
    'user@example.com',
  );
  db.close();
});
it('rejects primitives, arrays and oversize JSON with client errors', async () => {
  for (const value of ['null', '[]', '1', '"text"', '{'])
    await expect(
      body(new Request('https://site/api', { method: 'POST', body: value })),
    ).rejects.toMatchObject({ status: 400 });
  await expect(
    body(new Request('https://site/api', { method: 'POST', body: '{"x":"12345"}' }), 5),
  ).rejects.toMatchObject({ status: 413 });
});
it('preserves the email verification CSP and prevents token leakage by referrer', async () => {
  const { db, env } = fixture();
  env.RESEND_API_KEY = 'test';
  env.EMAIL_FROM = 'test@example.com';
  const response = await worker.fetch(
    new Request(env.APP_ORIGIN + '/api/auth/email/verify?token=' + 'a'.repeat(64)),
    env,
  );
  expect(response.status).toBe(200);
  expect(response.headers.get('Content-Security-Policy')).toContain("default-src 'none'");
  expect(response.headers.get('Referrer-Policy')).toBe('no-referrer');
  expect(response.headers.get('Cache-Control')).toBe('no-store');
  db.close();
});
it('uses unique CSP nonces and does not cache session-dependent pages and redirects', async () => {
  const { db, env } = fixture();
  const first = await worker.fetch(new Request(env.APP_ORIGIN + '/login'), env);
  const second = await worker.fetch(new Request(env.APP_ORIGIN + '/login'), env);
  expect(first.headers.get('Content-Security-Policy')).not.toBe(
    second.headers.get('Content-Security-Policy'),
  );
  expect(first.headers.get('Content-Security-Policy')).toContain("script-src-attr 'none'");
  const nonce = (await first.text()).match(/name="csp-nonce" content="([a-f0-9]+)"/)?.[1];
  expect(nonce).toHaveLength(32);
  expect(first.headers.get('Content-Security-Policy')).toContain(`'nonce-${nonce}'`);
  expect(first.headers.get('Cache-Control')).toBe('no-store');
  const redirect = await worker.fetch(new Request(env.APP_ORIGIN + '/top'), env);
  expect(redirect.status).toBe(302);
  expect(redirect.headers.get('Cache-Control')).toBe('no-store');
  db.close();
});
it('refuses a forged player header and cross-origin writes', async () => {
  const { db, env } = fixture();
  const read = await worker.fetch(
    new Request(env.APP_ORIGIN + '/api/match/another-player', {
      headers: { 'X-Player': 'victim' },
    }),
    env,
  );
  expect(read.status).toBe(401);
  const write = await worker.fetch(
    new Request(env.APP_ORIGIN + '/api/profile', {
      method: 'POST',
      headers: { Origin: 'https://evil.example' },
      body: '{}',
    }),
    env,
  );
  expect(write.status).toBe(403);
  db.close();
});
