import { assert, hash, json, type Env } from './env';
import { cookie, cookieValue, sessionResponse } from './auth';
export async function requestEmail(req: Request, env: Env, value: unknown) {
  assert(
    env.RESEND_API_KEY && env.EMAIL_FROM,
    503,
    'AUTH_UNAVAILABLE',
    'Email sign-in is being connected.',
  );
  assert(
    typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    400,
    'INVALID_EMAIL',
    'Enter a valid email address.',
  );
  const email = value.trim().toLowerCase();
  const now = Date.now();
  const hour = Math.floor(now / 3600000);
  // Atomic limits bound email bombing and total sender usage before any outbound request.
  for (const [key, limit] of [
    [`ip:${req.headers.get('CF-Connecting-IP') ?? 'local'}:${hour}`, 10],
    [`global:${Math.floor(now / 86400000)}`, 100],
    [`email:${email}:${hour}`, 3],
  ] as const) {
    const admitted = await env.DB.prepare(
      'INSERT INTO auth_rate_limits(key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 WHERE count<? RETURNING count',
    )
      .bind(await hash(key), now + 86400000, limit)
      .first();
    assert(admitted, 429, 'RATE_LIMITED', 'Too many sign-in requests. Please try again later.');
  }
  await env.DB.batch([
    env.DB.prepare('DELETE FROM auth_rate_limits WHERE expires_at<?').bind(now),
    env.DB.prepare('DELETE FROM email_login_links WHERE expires_at<?').bind(now),
  ]);
  const token = crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '');
  const browser = cookie(req, 'cc_email_browser') ?? crypto.randomUUID();
  const digest = await hash(token);
  await env.DB.prepare('INSERT INTO email_login_links VALUES (?,?,?,?)')
    .bind(digest, email, await hash(browser), now + 600000)
    .run();
  const link = env.APP_ORIGIN + '/api/auth/email/verify?token=' + token;
  try {
    const sent = await fetch('https://api.resend.com/emails', {
      signal: AbortSignal.timeout(10000),
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: [email],
        subject: 'Your CodeClash sign-in link',
        text: `Sign in to CodeClash: ${link}\n\nOpen this link in the browser where you requested it. It expires in 10 minutes and works once. If you did not request this, ignore this email.`,
      }),
    });
    assert(
      sent.ok,
      502,
      'EMAIL_FAILED',
      'Could not send the sign-in link. Please try again later.',
    );
  } catch (error) {
    await env.DB.prepare('DELETE FROM email_login_links WHERE token_hash=?').bind(digest).run();
    throw error;
  }
  const response = json({
    ok: true,
    message: 'Check your inbox. Open the link in this browser within 10 minutes.',
  });
  response.headers.append('Set-Cookie', cookieValue('cc_email_browser', browser, req, 600));
  return response;
}
export async function verifyEmail(req: Request, env: Env) {
  assert(
    env.RESEND_API_KEY && env.EMAIL_FROM,
    503,
    'AUTH_UNAVAILABLE',
    'Email sign-in is being connected.',
  );
  const token = new URL(req.url).searchParams.get('token');
  assert(
    token && /^[a-f0-9]{64}$/.test(token),
    400,
    'INVALID_LINK',
    'This sign-in link is invalid or expired.',
  );
  if (req.method === 'GET') {
    // A GET cannot consume a link: mail scanners must not sign users in.
    return new Response(
      `<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sign in to CodeClash</title><style>body{font:16px system-ui;background:#F7FAFC;color:#0F172A;padding:40px}main{max-width:420px;margin:60px auto;background:white;border:1px solid #D9E2EC;border-radius:14px;padding:28px}button{background:#A3E635;border:0;border-radius:10px;padding:14px 20px;font:600 16px system-ui}p{line-height:1.6;color:#475569}</style><main><h1>Welcome to CodeClash.</h1><p>Continue in the browser where you requested this link.</p><form method="post" action="/api/auth/email/verify?token=${token}"><button>Sign in</button></form></main></html>`,
      {
        headers: {
          'Content-Type': 'text/html;charset=utf-8',
          'Cache-Control': 'no-store',
          'Referrer-Policy': 'no-referrer',
          'Content-Security-Policy':
            "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'",
        },
      },
    );
  }
  const browser = cookie(req, 'cc_email_browser');
  assert(browser, 400, 'INVALID_LINK', 'Open the link in the browser where you requested it.');
  const row = await env.DB.prepare(
    'DELETE FROM email_login_links WHERE token_hash=? AND browser_hash=? AND expires_at>? RETURNING email',
  )
    .bind(await hash(token), await hash(browser), Date.now())
    .first<{ email: string }>();
  assert(row, 400, 'INVALID_LINK', 'This sign-in link is invalid or expired.');
  const digest = await hash(row.email);
  const id = 'email-' + digest;
  await env.DB.prepare(
    'INSERT OR IGNORE INTO users(id,auth_subject,username,created_at) VALUES (?,?,?,?)',
  )
    .bind(id, id, 'Player-' + digest.slice(0, 16), Date.now())
    .run();
  const response = await sessionResponse(req, env, id, true);
  response.headers.append('Set-Cookie', cookieValue('cc_email_browser', '', req, 0));
  return response;
}
