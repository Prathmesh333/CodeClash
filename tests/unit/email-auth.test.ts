import { it, expect, vi, afterEach } from 'vitest';
import { requestEmail, verifyEmail } from '../../apps/worker/src/email-auth';
import type { Env } from '../../apps/worker/src/env';
afterEach(() => vi.unstubAllGlobals());
function fixture() {
  const links = new Map<string, { email: string; browser: string; expires: number }>();
  const counts = new Map<string, number>();
  let sessions = 0;
  const env = {
    APP_ORIGIN: 'https://code-clash.com',
    RESEND_API_KEY: 'test',
    EMAIL_FROM: 'CodeClash <login@code-clash.com>',
    DB: {
      async batch() {
        return [];
      },
      prepare(sql: string) {
        let values: any[] = [];
        return {
          bind(...args: any[]) {
            values = args;
            return this;
          },
          async run() {
            if (sql.startsWith('INSERT INTO email_login_links'))
              links.set(values[0], { email: values[1], browser: values[2], expires: values[3] });
            if (sql.startsWith('DELETE FROM email_login_links')) links.delete(values[0]);
            if (sql.startsWith('INSERT INTO sessions')) sessions++;
            return {};
          },
          async first() {
            if (sql.startsWith('INSERT INTO auth_rate_limits')) {
              const n = counts.get(values[0]) ?? 0;
              if (n >= values[2]) return null;
              counts.set(values[0], n + 1);
              return { count: n + 1 };
            }
            if (sql.startsWith('DELETE FROM email_login_links')) {
              const row = links.get(values[0]);
              if (!row || row.browser !== values[1] || row.expires <= values[2]) return null;
              links.delete(values[0]);
              return { email: row.email };
            }
            return null;
          },
        };
      },
    },
  } as unknown as Env;
  return {
    env,
    links,
    get sessions() {
      return sessions;
    },
  };
}
it('email links are browser-bound, single-use and not consumed by GET', async () => {
  const f = fixture();
  const fetch = vi.fn().mockResolvedValue(Response.json({ id: 'sent' }));
  vi.stubGlobal('fetch', fetch);
  const start = await requestEmail(
    new Request(f.env.APP_ORIGIN + '/api/auth/email', { method: 'POST' }),
    f.env,
    'coder@example.com',
  );
  const email = JSON.parse(fetch.mock.calls[0][1].body);
  const link = email.text.match(/https:\/\/\S+/)[0];
  const headers = { Cookie: start.headers.getSetCookie()[0].split(';')[0] };
  expect([...f.links.keys()][0]).not.toBe(new URL(link).searchParams.get('token'));
  expect((await verifyEmail(new Request(link), f.env)).status).toBe(200);
  expect(f.sessions).toBe(0);
  await expect(verifyEmail(new Request(link, { method: 'POST' }), f.env)).rejects.toThrow(
    'browser',
  );
  expect(f.links.size).toBe(1);
  expect((await verifyEmail(new Request(link, { method: 'POST', headers }), f.env)).status).toBe(
    302,
  );
  expect(f.sessions).toBe(1);
  await expect(verifyEmail(new Request(link, { method: 'POST', headers }), f.env)).rejects.toThrow(
    'expired',
  );
});
it('limits repeated email sends and removes links after delivery failures', async () => {
  const f = fixture();
  const fetch = vi.fn().mockResolvedValue(Response.json({ id: 'sent' }));
  vi.stubGlobal('fetch', fetch);
  const req = new Request(f.env.APP_ORIGIN + '/api/auth/email', { method: 'POST' });
  for (let i = 0; i < 3; i++) await requestEmail(req, f.env, 'coder@example.com');
  await expect(requestEmail(req, f.env, 'coder@example.com')).rejects.toThrow('Too many');
  expect(fetch).toHaveBeenCalledTimes(3);
  const other = fixture();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 500 })));
  await expect(requestEmail(req, other.env, 'coder@example.com')).rejects.toThrow('Could not send');
  expect(other.links.size).toBe(0);
});
it('expired links cannot create sessions', async () => {
  const f = fixture();
  const fetch = vi.fn().mockResolvedValue(Response.json({ id: 'sent' }));
  vi.stubGlobal('fetch', fetch);
  const start = await requestEmail(
    new Request(f.env.APP_ORIGIN + '/api/auth/email', { method: 'POST' }),
    f.env,
    'coder@example.com',
  );
  for (const row of f.links.values()) row.expires = 0;
  const link = JSON.parse(fetch.mock.calls[0][1].body).text.match(/https:\/\/\S+/)[0];
  const token = new URL(link).searchParams.get('token');
  await expect(
    verifyEmail(
      new Request(f.env.APP_ORIGIN + '/api/auth/email/verify?token=' + token, {
        method: 'POST',
        headers: { Cookie: start.headers.getSetCookie()[0].split(';')[0] },
      }),
      f.env,
    ),
  ).rejects.toThrow('expired');
  expect(f.sessions).toBe(0);
});
