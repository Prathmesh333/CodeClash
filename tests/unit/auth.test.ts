import { afterEach, expect, it, vi } from 'vitest';
import { google, github, loginLocal } from '../../apps/worker/src/auth';
import type { Env } from '../../apps/worker/src/env';
afterEach(() => vi.unstubAllGlobals());
function fixture() {
  const states = new Set<string>();
  const sessions: unknown[][] = [];
  const users = new Set<string>();
  const env = {
    APP_ENV: 'staging',
    APP_ORIGIN: 'https://ranked-dsa-staging.example.com',
    GITHUB_CLIENT_ID: 'test-id',
    GITHUB_CLIENT_SECRET: 'test-secret',
    DB: {
      prepare(sql: string) {
        let values: unknown[] = [];
        return {
          bind(...v: unknown[]) {
            values = v;
            return this;
          },
          async run() {
            if (sql.startsWith('INSERT INTO oauth_states')) states.add(String(values[0]));
            if (sql.startsWith('INSERT INTO sessions')) sessions.push(values);
            if (sql.startsWith('INSERT OR IGNORE INTO users')) users.add(String(values[0]));
            return {};
          },
          async first() {
            if (sql.startsWith('DELETE FROM oauth_states')) {
              const key = String(values[0]);
              return states.delete(key) ? { state_hash: key } : null;
            }
            return null;
          },
        };
      },
    },
  } as unknown as Env;
  return { env, states, sessions, users };
}
it('uses PKCE, creates one persistent identity, and refuses callback replay', async () => {
  const f = fixture();
  const start = await github(new Request(f.env.APP_ORIGIN + '/api/auth/github'), f.env);
  const url = new URL(start.headers.get('location')!);
  expect(url.searchParams.get('code_challenge_method')).toBe('S256');
  expect(url.searchParams.get('code_challenge')).toMatch(/^[A-Za-z0-9_-]{43}$/);
  const cookies = start.headers.getSetCookie();
  expect(cookies).toHaveLength(2);
  for (const c of cookies) {
    expect(c).toContain('HttpOnly');
    expect(c).toContain('Secure');
    expect(c).toContain('SameSite=Lax');
  }
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ access_token: 'fake-token' }))
    .mockResolvedValueOnce(Response.json({ id: 42, login: 'coder' }));
  vi.stubGlobal('fetch', fetch);
  const request = new Request(
    f.env.APP_ORIGIN + '/api/auth/github/callback?code=test&state=' + url.searchParams.get('state'),
    { headers: { Cookie: cookies.map((c) => c.split(';')[0]).join('; ') } },
  );
  const result = await github(request, f.env);
  expect(result.status).toBe(302);
  expect(result.headers.get('location')).toBe(f.env.APP_ORIGIN);
  expect(f.users.has('gh-42')).toBe(true);
  expect(f.sessions).toHaveLength(1);
  const exchanged = JSON.parse(fetch.mock.calls[0][1].body);
  expect(exchanged.code_verifier).toHaveLength(72);
  expect(result.headers.getSetCookie().filter((c) => c.includes('Max-Age=0'))).toHaveLength(2);
  await expect(github(request, f.env)).rejects.toThrow('Sign-in expired');
  expect(fetch).toHaveBeenCalledTimes(2);
});
it('refuses mismatched state before exchanging a code', async () => {
  const f = fixture();
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  await expect(
    github(
      new Request(f.env.APP_ORIGIN + '/api/auth/github/callback?code=a&state=b', {
        headers: { Cookie: 'rdsa_oauth=c; rdsa_pkce=d' },
      }),
      f.env,
    ),
  ).rejects.toThrow('Sign-in expired');
  expect(fetch).not.toHaveBeenCalled();
});
it('disables demo sign-in outside the local environment', async () => {
  const f = fixture();
  await expect(
    loginLocal(new Request('http://localhost/api/auth/local'), f.env, 'alice'),
  ).rejects.toThrow('Not found');
});

it('Google persists a namespaced identity and rejects callback replay', async () => {
  const f = fixture();
  f.env.GOOGLE_CLIENT_ID = 'google-id';
  f.env.GOOGLE_CLIENT_SECRET = 'google-secret';
  const start = await google(new Request(f.env.APP_ORIGIN + '/api/auth/google'), f.env);
  const url = new URL(start.headers.get('location')!);
  expect(url.origin).toBe('https://accounts.google.com');
  expect(url.searchParams.get('scope')).toBe('openid profile email');
  expect(url.searchParams.get('code_challenge_method')).toBe('S256');
  const request = new Request(
    f.env.APP_ORIGIN + '/api/auth/google/callback?code=test&state=' + url.searchParams.get('state'),
    {
      headers: {
        Cookie: start.headers
          .getSetCookie()
          .map((c) => c.split(';')[0])
          .join('; '),
      },
    },
  );
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ access_token: 'token' }))
    .mockResolvedValueOnce(Response.json({ sub: '123', name: 'Coder', email_verified: true }));
  vi.stubGlobal('fetch', fetch);
  const result = await google(request, f.env);
  expect(result.status).toBe(302);
  expect([...f.users][0]).toMatch(/^google-[a-f0-9]{64}$/);
  expect(f.sessions).toHaveLength(1);
  expect(new URLSearchParams(fetch.mock.calls[0][1].body).get('code_verifier')).toHaveLength(72);
  await expect(google(request, f.env)).rejects.toThrow('Sign-in expired');
});
it('Google rejects unverified identities without creating a session', async () => {
  const f = fixture();
  f.env.GOOGLE_CLIENT_ID = 'id';
  f.env.GOOGLE_CLIENT_SECRET = 'secret';
  const start = await google(new Request(f.env.APP_ORIGIN + '/api/auth/google'), f.env);
  const state = new URL(start.headers.get('location')!).searchParams.get('state');
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValueOnce(Response.json({ access_token: 'token' }))
      .mockResolvedValueOnce(Response.json({ sub: '123', email_verified: false })),
  );
  await expect(
    google(
      new Request(f.env.APP_ORIGIN + '/api/auth/google/callback?code=test&state=' + state, {
        headers: {
          Cookie: start.headers
            .getSetCookie()
            .map((c) => c.split(';')[0])
            .join('; '),
        },
      }),
      f.env,
    ),
  ).rejects.toThrow('verified Google account');
  expect(f.sessions).toHaveLength(0);
});
