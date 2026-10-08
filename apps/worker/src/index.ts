import { exportData, requestPrivacy } from './privacy';
import { requestEmail, verifyEmail } from './email-auth';
import { assert, ApiError, body, hash, json, localRequest, type Env } from './env';
import { cookie, currentUser, google, github, loginLocal, logout } from './auth';
import { testState } from './evidence';
import type { Game, User } from '../../../packages/shared/game';
export { MatchmakerDO } from './matchmaker';
export { MatchDO } from './match';
const application = {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;
    if (env.APP_ENV !== 'local' && url.origin !== env.APP_ORIGIN) {
      const canonical = new URL(env.APP_ORIGIN);
      canonical.pathname = url.pathname;
      canonical.search = url.search;
      return Response.redirect(canonical.toString(), 308);
    }
    try {
      if (!path.startsWith('/api/')) {
        const asset = env.ASSETS
          ? await env.ASSETS.fetch(req)
          : new Response('Start the Vite frontend on port 5173.');
        if (env.ASSETS && ['/privacy', '/cookies', '/terms', '/contact', '/safety'].includes(path))
          return await env.ASSETS.fetch(new Request(new URL('/', url), req));
        if (path.startsWith('/python-runtime/')) {
          const response = new Response(asset.body, asset);
          response.headers.set('Access-Control-Allow-Origin', '*');
          response.headers.set('Cross-Origin-Resource-Policy', 'cross-origin');
          return response;
        }
        return asset;
      }
      if (req.method !== 'GET' || req.headers.get('Upgrade')) {
        const origin = req.headers.get('Origin');
        const allowed =
          origin === env.APP_ORIGIN ||
          (localRequest(req, env) &&
            ['http://localhost:5173', 'http://127.0.0.1:5173'].includes(origin ?? ''));
        assert(allowed, 403, 'ORIGIN_DENIED', 'Request origin is not allowed.');
      }
      if (path === '/api/health')
        return json({
          ok: true,
          environment: env.APP_ENV,
          judge: env.JUDGE_ENABLED === 'true' && !!env.JUDGE ? 'configured' : 'unavailable',
          local: localRequest(req, env),
          casual: env.CASUAL_WASM === 'true',
          github: Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET),
          google: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
          email: Boolean(env.RESEND_API_KEY && env.EMAIL_FROM),
        });
      // Read-only evidence for automated assertions; local environment and opt-in flag only.
      if (
        path === '/api/test/state' &&
        req.method === 'GET' &&
        env.APP_ENV === 'local' &&
        env.TEST_EVIDENCE === 'true' &&
        localRequest(req, env)
      )
        return await testState(env);
      if (path.startsWith('/api/test/'))
        return json({ code: 'NOT_FOUND', message: 'Not found.' }, 404);
      if (path === '/api/auth/local' && req.method === 'POST')
        return await loginLocal(req, env, (await body(req, 1024)).id);
      if (['/api/auth/github', '/api/auth/github/callback'].includes(path) && req.method === 'GET')
        return await github(req, env);
      if (['/api/auth/google', '/api/auth/google/callback'].includes(path) && req.method === 'GET')
        return await google(req, env);
      if (path === '/api/auth/email' && req.method === 'POST')
        return await requestEmail(req, env, (await body(req, 1024)).email);
      if (path === '/api/auth/email/verify' && ['GET', 'POST'].includes(req.method))
        return await verifyEmail(req, env);
      if (path === '/api/auth/logout' && req.method === 'POST') return await logout(req, env);
      const user = await currentUser(req, env);
      if (path === '/api/me')
        return json({
          user: user
            ? {
                id: user.id,
                username: user.username,
                bio: user.bio,
                avatar_color: user.avatar_color,
                profile_complete: user.profile_complete,
                rating: user.rating,
                wins: user.wins,
                losses: user.losses,
                draws: user.draws,
                games_played: user.games_played,
              }
            : null,
        });
      if (path === '/api/leaderboard') {
        const offset = Math.max(0, Math.min(10000, Number(url.searchParams.get('offset')) || 0));
        return json({
          players: (
            await env.DB.prepare(
              'SELECT id,username,avatar_color,rating,wins,losses,draws,games_played FROM users WHERE profile_complete=1 ORDER BY rating DESC,id LIMIT 50 OFFSET ?',
            )
              .bind(offset)
              .all()
          ).results,
        });
      }
      assert(user, 401, 'AUTH_REQUIRED', 'Sign in to enter the arena.');
      if (path === '/api/privacy/export' && req.method === 'GET') {
        const offset = Number(url.searchParams.get('offset') ?? 0);
        assert(
          Number.isSafeInteger(offset) && offset >= 0,
          400,
          'INVALID_OFFSET',
          'Invalid export page.',
        );
        return await exportData(env, user, offset);
      }
      if (path === '/api/privacy/requests' && req.method === 'GET')
        return json({
          requests: (
            await env.DB.prepare(
              'SELECT id,kind,status,response,created_at FROM privacy_requests WHERE user_id=? ORDER BY created_at DESC',
            )
              .bind(user.id)
              .all()
          ).results,
        });
      if (path === '/api/privacy/requests' && req.method === 'POST')
        return await requestPrivacy(env, user, await body(req, 4096));
      if (path === '/api/profile' && req.method === 'POST')
        return await env.MATCHMAKER.get(env.MATCHMAKER.idFromName('alpha')).fetch(
          'https://queue/internal',
          {
            method: 'POST',
            body: JSON.stringify({
              action: 'update-profile',
              user,
              profile: await body(req, 2048),
            }),
          },
        );
      if (path === '/api/matches')
        return json({
          matches: (
            await env.DB.prepare(
              'SELECT m.*,p.public_json FROM matches m JOIN problems p ON m.problem_id=p.id WHERE (player_a=? OR player_b=?) AND finished_at IS NOT NULL ORDER BY finished_at DESC LIMIT 50',
            )
              .bind(user.id, user.id)
              .all()
          ).results.map((r) => ({
            ...r,
            problemTitle: JSON.parse(r.public_json as string).title,
            public_json: undefined,
          })),
        });
      if (path.startsWith('/api/matchmaking/')) {
        const action = path.split('/').pop()!;
        if (action === 'join')
          assert(
            user.profile_complete !== 0,
            409,
            'PROFILE_REQUIRED',
            'Choose your username before finding a match.',
          );
        assert(['join', 'leave', 'status'].includes(action), 404, 'NOT_FOUND', 'Not found.');
        assert(
          req.method === (action === 'status' ? 'GET' : 'POST'),
          405,
          'METHOD',
          'Method not allowed.',
        );
        if (action === 'join' && env.APP_ENV !== 'local')
          assert(
            env.CASUAL_WASM === 'true' || (env.JUDGE_ENABLED === 'true' && env.JUDGE),
            503,
            'JUDGE_UNAVAILABLE',
            'The arena is temporarily unavailable.',
          );
        return await env.MATCHMAKER.get(env.MATCHMAKER.idFromName('alpha')).fetch('https://queue', {
          method: 'POST',
          body: JSON.stringify({ action, user }),
        });
      }
      const match = path.match(
        /^\/api\/match\/([\w-]+)(?:\/(ready|run|submit|claim|forfeit|rematch|ws))?$/,
      );
      if (match) {
        const [, id, action] = match;
        assert(
          req.method === (!action || action === 'ws' ? 'GET' : 'POST'),
          405,
          'METHOD',
          'Method not allowed.',
        );
        const headers = new Headers(req.headers);
        headers.set('X-Player', user.id);
        headers.set('X-Session-Hash', await hash(cookie(req, 'rdsa_session')!));
        headers.set('X-Session-Expires', String(user.session_expires_at));
        const room = env.MATCHES.get(env.MATCHES.idFromName(id));
        const forwardedBody = req.method === 'GET' ? undefined : JSON.stringify(await body(req));
        const response = await room.fetch(
          new Request('https://room/' + (action ?? 'snapshot'), {
            method: req.method,
            headers,
            body: forwardedBody,
          }),
        );
        if (action === 'rematch' && response.ok) {
          const snapshot = (await response.clone().json()) as { rematchVotes: string[] };
          if (snapshot.rematchVotes.length === 2) {
            const game = (await (await room.fetch('https://room/internal')).json()) as Game;
            const players = await Promise.all(
              game.players.map((p) =>
                env.DB.prepare('SELECT * FROM users WHERE id=?').bind(p.id).first<User>(),
              ),
            );
            const result = await env.MATCHMAKER.get(env.MATCHMAKER.idFromName('alpha')).fetch(
              'https://queue',
              {
                method: 'POST',
                body: JSON.stringify({ action: 'rematch', user, players, sourceMatchId: id }),
              },
            );
            if (result.ok) {
              const next = (await result.clone().json()) as { matchId: string };
              await room.fetch('https://room/rematch-created', {
                method: 'POST',
                body: JSON.stringify(next),
              });
            }
            return result;
          }
        }
        return response;
      }
      return json({ code: 'NOT_FOUND', message: 'Not found.' }, 404);
    } catch (error) {
      if (error instanceof ApiError)
        return json({ code: error.code, message: error.message }, error.status);
      const requestId = crypto.randomUUID();
      console.error(
        JSON.stringify({
          event: 'request_failed',
          requestId,
          path,
          error: error instanceof Error ? error.name : 'Unknown',
        }),
      );
      return json(
        { code: 'INTERNAL', message: 'Something went wrong. Please try again.', requestId },
        500,
      );
    }
  },
} satisfies ExportedHandler<Env>;

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const response = await application.fetch(req, env);
    if (response.status === 101) return response;
    const protectedResponse = new Response(response.body, response);
    protectedResponse.headers.set('X-Content-Type-Options', 'nosniff');
    protectedResponse.headers.set('Referrer-Policy', 'same-origin');
    protectedResponse.headers.set('X-Frame-Options', 'DENY');
    protectedResponse.headers.set(
      'Content-Security-Policy',
      "base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'",
    );
    protectedResponse.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    if (new URL(req.url).protocol === 'https:')
      protectedResponse.headers.set('Strict-Transport-Security', 'max-age=31536000');
    return protectedResponse;
  },
  async scheduled(_event: ScheduledController, env: Env) {
    const now = Date.now();
    await env.DB.batch([
      env.DB.prepare('DELETE FROM sessions WHERE expires_at<?').bind(now),
      env.DB.prepare('DELETE FROM oauth_states WHERE expires_at<?').bind(now),
      env.DB.prepare('DELETE FROM email_login_links WHERE expires_at<?').bind(now),
      env.DB.prepare('DELETE FROM auth_rate_limits WHERE expires_at<?').bind(now),
    ]);
  },
} satisfies ExportedHandler<Env>;
