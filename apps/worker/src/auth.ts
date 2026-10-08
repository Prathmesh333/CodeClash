import { ApiError, assert, hash, json, localRequest, type Env } from './env';
import type { User } from '../../../packages/shared/game';
export function cookie(req: Request, name: string) {
  return req.headers
    .get('Cookie')
    ?.split(';')
    .map((s) => s.trim())
    .find((s) => s.startsWith(name + '='))
    ?.slice(name.length + 1);
}
export function cookieValue(name: string, value: string, req: Request, maxAge: number) {
  return `${name}=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${new URL(req.url).protocol === 'https:' ? '; Secure' : ''}`;
}
export async function currentUser(
  req: Request,
  env: Env,
): Promise<(User & { session_expires_at: number }) | null> {
  const token = cookie(req, 'rdsa_session');
  if (!token || token.length > 128) return null;
  return env.DB.prepare(
    'SELECT u.*,s.expires_at AS session_expires_at FROM users u JOIN sessions s ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?',
  )
    .bind(await hash(token), Date.now())
    .first<User & { session_expires_at: number }>();
}
export async function sessionResponse(req: Request, env: Env, id: string, redirect = false) {
  const token = crypto.randomUUID() + crypto.randomUUID();
  await env.DB.prepare('INSERT INTO sessions VALUES (?,?,?)')
    .bind(await hash(token), id, Date.now() + 7 * 86400000)
    .run();
  return new Response(redirect ? null : JSON.stringify({ ok: true }), {
    status: redirect ? 302 : 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Set-Cookie': cookieValue('rdsa_session', token, req, 7 * 86400),
      ...(redirect ? { Location: env.APP_ORIGIN } : {}),
    },
  });
}
export async function loginLocal(req: Request, env: Env, id: unknown) {
  assert(localRequest(req, env), 404, 'NOT_FOUND', 'Not found.');
  assert(
    typeof id === 'string' && /^[\w-]{1,40}$/.test(id),
    400,
    'INVALID_USER',
    'Select a demo player.',
  );
  assert(
    await env.DB.prepare('SELECT id FROM users WHERE id=?').bind(id).first(),
    503,
    'NOT_SEEDED',
    'Run the local database seed first.',
  );
  return sessionResponse(req, env, id);
}
export async function logout(req: Request, env: Env) {
  const token = cookie(req, 'rdsa_session');
  if (token)
    await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?')
      .bind(await hash(token))
      .run();
  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': cookieValue('rdsa_session', '', req, 0),
    },
  });
}
export async function github(req: Request, env: Env) {
  assert(
    env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET,
    503,
    'AUTH_UNAVAILABLE',
    'GitHub sign-in has not been configured yet.',
  );
  const url = new URL(req.url);
  const callback = env.APP_ORIGIN + '/api/auth/github/callback';
  if (!url.pathname.endsWith('/callback')) {
    const state = crypto.randomUUID();
    const verifier = crypto.randomUUID() + crypto.randomUUID();
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
    const challenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replaceAll('+', '-')
      .replaceAll('/', '_')
      .replace(/=+$/, '');
    await env.DB.prepare('INSERT INTO oauth_states VALUES (?,?)')
      .bind(await hash(state), Date.now() + 600000)
      .run();
    const target = new URL('https://github.com/login/oauth/authorize');
    target.search = new URLSearchParams({
      client_id: env.GITHUB_CLIENT_ID,
      redirect_uri: callback,
      state,
      scope: 'read:user',
      code_challenge: challenge,
      code_challenge_method: 'S256',
    }).toString();
    const headers = new Headers({ Location: target.toString() });
    headers.append('Set-Cookie', cookieValue('rdsa_oauth', state, req, 600));
    headers.append('Set-Cookie', cookieValue('rdsa_pkce', verifier, req, 600));
    return new Response(null, { status: 302, headers });
  }
  const state = url.searchParams.get('state');
  const code = url.searchParams.get('code');
  const verifier = cookie(req, 'rdsa_pkce');
  assert(
    state && code && verifier && cookie(req, 'rdsa_oauth') === state,
    400,
    'INVALID_STATE',
    'Sign-in expired. Try again.',
  );
  const consumed = await env.DB.prepare(
    'DELETE FROM oauth_states WHERE state_hash=? AND expires_at>? RETURNING state_hash',
  )
    .bind(await hash(state), Date.now())
    .first();
  assert(consumed, 400, 'INVALID_STATE', 'Sign-in expired. Try again.');
  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      code_verifier: verifier,
      redirect_uri: callback,
    }),
  });
  assert(tokenResponse.ok, 502, 'AUTH_FAILED', 'GitHub sign-in could not be completed. Try again.');
  const token = (await tokenResponse.json()) as { access_token?: string };
  assert(token.access_token, 401, 'AUTH_FAILED', 'Could not sign in.');
  const profileResponse = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'RankedDSA',
    },
  });
  assert(profileResponse.ok, 401, 'AUTH_FAILED', 'Could not verify your account.');
  const profile = (await profileResponse.json()) as { id: number; login: string };
  assert(
    Number.isSafeInteger(profile.id) && typeof profile.login === 'string',
    401,
    'AUTH_FAILED',
    'Invalid account response.',
  );
  const id = 'gh-' + profile.id;
  await env.DB.prepare(
    'INSERT OR IGNORE INTO users(id,auth_subject,username,created_at) VALUES (?,?,?,?)',
  )
    .bind(id, id, profile.login.slice(0, 32) + '-' + profile.id, Date.now())
    .run();
  const response = await sessionResponse(req, env, id, true);
  response.headers.append('Set-Cookie', cookieValue('rdsa_oauth', '', req, 0));
  response.headers.append('Set-Cookie', cookieValue('rdsa_pkce', '', req, 0));
  return response;
}

export async function google(req: Request, env: Env) {
  assert(
    env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET,
    503,
    'AUTH_UNAVAILABLE',
    'Google sign-in has not been configured yet.',
  );
  const url = new URL(req.url);
  const callback = env.APP_ORIGIN + '/api/auth/google/callback';
  if (!url.pathname.endsWith('/callback')) {
    const state = crypto.randomUUID();
    const verifier = crypto.randomUUID() + crypto.randomUUID();
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
    const challenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replaceAll('+', '-')
      .replaceAll('/', '_')
      .replace(/=+$/, '');
    await env.DB.prepare('INSERT INTO oauth_states VALUES (?,?)')
      .bind(await hash('google:' + state), Date.now() + 600000)
      .run();
    const target = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    target.search = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      redirect_uri: callback,
      state,
      scope: 'openid profile email',
      response_type: 'code',
      code_challenge: challenge,
      code_challenge_method: 'S256',
    }).toString();
    const headers = new Headers({ Location: target.toString() });
    headers.append('Set-Cookie', cookieValue('rdsa_google_oauth', state, req, 600));
    headers.append('Set-Cookie', cookieValue('rdsa_google_pkce', verifier, req, 600));
    return new Response(null, { status: 302, headers });
  }
  const state = url.searchParams.get('state');
  const code = url.searchParams.get('code');
  const verifier = cookie(req, 'rdsa_google_pkce');
  assert(
    state && code && verifier && cookie(req, 'rdsa_google_oauth') === state,
    400,
    'INVALID_STATE',
    'Sign-in expired. Try again.',
  );
  const consumed = await env.DB.prepare(
    'DELETE FROM oauth_states WHERE state_hash=? AND expires_at>? RETURNING state_hash',
  )
    .bind(await hash('google:' + state), Date.now())
    .first();
  assert(consumed, 400, 'INVALID_STATE', 'Sign-in expired. Try again.');
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID!,
      client_secret: env.GOOGLE_CLIENT_SECRET!,
      code: code!,
      code_verifier: verifier!,
      redirect_uri: callback,
      grant_type: 'authorization_code',
    }),
  });
  assert(tokenResponse.ok, 502, 'AUTH_FAILED', 'Google sign-in could not be completed.');
  const token = (await tokenResponse.json()) as { access_token?: string };
  assert(
    typeof token.access_token === 'string' && token.access_token,
    401,
    'AUTH_FAILED',
    'Could not sign in.',
  );
  const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  assert(profileResponse.ok, 401, 'AUTH_FAILED', 'Could not verify your account.');
  const profile = (await profileResponse.json()) as {
    sub?: string;
    name?: string;
    email_verified?: boolean;
  };
  assert(
    typeof profile.sub === 'string' &&
      profile.sub.length > 0 &&
      profile.sub.length <= 255 &&
      profile.email_verified === true,
    401,
    'AUTH_FAILED',
    'A verified Google account is required.',
  );
  const digest = await hash(profile.sub);
  const id = 'google-' + digest;
  const display =
    (typeof profile.name === 'string' ? profile.name : 'Player')
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .slice(0, 18) || 'Player';
  await env.DB.prepare(
    'INSERT OR IGNORE INTO users(id,auth_subject,username,created_at) VALUES (?,?,?,?)',
  )
    .bind(id, id, display + '-' + digest.slice(0, 12), Date.now())
    .run();
  const response = await sessionResponse(req, env, id, true);
  response.headers.append('Set-Cookie', cookieValue('rdsa_google_oauth', '', req, 0));
  response.headers.append('Set-Cookie', cookieValue('rdsa_google_pkce', '', req, 0));
  return response;
}
