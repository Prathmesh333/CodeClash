import { assert, json, type Env } from './env';
import type { User } from '../../../packages/shared/game';
export async function requestPrivacy(env: Env, user: User, value: unknown) {
  const data = value as { kind?: unknown; message?: unknown };
  assert(
    data &&
      typeof data.kind === 'string' &&
      ['access', 'erasure', 'correction', 'objection', 'restriction', 'other'].includes(data.kind),
    400,
    'INVALID_REQUEST',
    'Choose a privacy request type.',
  );
  assert(
    typeof data.message === 'string' && data.message.trim().length <= 1000,
    400,
    'INVALID_MESSAGE',
    'Use up to 1,000 characters.',
  );
  await env.DB.prepare(
    'INSERT OR IGNORE INTO privacy_requests(id,user_id,kind,message,created_at) VALUES (?,?,?,?,?)',
  )
    .bind(crypto.randomUUID(), user.id, data.kind, data.message.trim(), Date.now())
    .run();
  const request = await env.DB.prepare(
    "SELECT id,kind,status,created_at FROM privacy_requests WHERE user_id=? AND kind=? AND status='pending'",
  )
    .bind(user.id, data.kind)
    .first();
  return json({ request }, 201);
}
export async function exportData(env: Env, user: User, offset: number) {
  const limit = 1000;
  const rows = async (sql: string) =>
    (
      await env.DB.prepare(sql)
        .bind(user.id, limit + 1, offset)
        .all()
    ).results;
  const [submissions, exposure, requests, matches, sessions] = await Promise.all([
    rows(
      'SELECT id,match_id,kind,language,source,verdict,runtime_ms,peak_memory_bytes,created_at FROM submissions WHERE user_id=? ORDER BY created_at,id LIMIT ? OFFSET ?',
    ),
    rows(
      'SELECT problem_id,revealed_at FROM exposure WHERE user_id=? ORDER BY problem_id LIMIT ? OFFSET ?',
    ),
    rows(
      'SELECT id,kind,message,status,response,created_at,resolved_at FROM privacy_requests WHERE user_id=? ORDER BY created_at,id LIMIT ? OFFSET ?',
    ),
    (async () =>
      (
        await env.DB.prepare(
          'SELECT id,problem_id,mode,created_at,finished_at,outcome_json FROM matches WHERE player_a=? OR player_b=? ORDER BY created_at,id LIMIT ? OFFSET ?',
        )
          .bind(user.id, user.id, limit + 1, offset)
          .all()
      ).results)(),
    rows('SELECT expires_at FROM sessions WHERE user_id=? ORDER BY expires_at LIMIT ? OFFSET ?'),
  ]);
  const profile = await env.DB.prepare(
    'SELECT id,auth_subject,username,bio,avatar_color,rating,wins,losses,draws,games_played,created_at FROM users WHERE id=?',
  )
    .bind(user.id)
    .first();
  const collections = {
    submissions: submissions.slice(0, limit),
    exposure: exposure.slice(0, limit),
    requests: requests.slice(0, limit),
    matches: matches.slice(0, limit).map(({ outcome_json, ...match }) => {
      const result = outcome_json ? JSON.parse(String(outcome_json)) : null;
      return {
        ...match,
        result: result
          ? {
              reason: result.reason,
              winner: result.winnerId === user.id ? 'you' : result.winnerId ? 'opponent' : null,
            }
          : null,
      };
    }),
    sessions: sessions.slice(0, limit),
  };
  return json({
    exportedAt: new Date().toISOString(),
    profile,
    collections,
    nextOffset: [submissions, exposure, requests, matches, sessions].some((r) => r.length > limit)
      ? offset + limit
      : null,
  });
}
