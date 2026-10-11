import { assert, body, json, type Env } from './env';
import type { User } from '../../../packages/shared/game';
export async function practice(req: Request, env: Env, user: User) {
  const url = new URL(req.url);
  if (url.pathname === '/api/practice' && req.method === 'GET') {
    const rows = await env.DB.prepare(
      "SELECT p.id,p.public_json,g.status FROM problems p LEFT JOIN practice_progress g ON g.problem_id=p.id AND g.user_id=? WHERE p.status='active' ORDER BY p.id LIMIT 500",
    )
      .bind(user.id)
      .all<{ id: string; public_json: string; status: string | null }>();
    return json({
      problems: rows.results.map((r) => {
        const p = JSON.parse(r.public_json);
        return {
          id: r.id,
          title: p.title,
          topic: p.topic,
          difficulty: p.difficulty,
          status: r.status,
        };
      }),
    });
  }
  const match = url.pathname.match(/^\/api\/practice\/([a-z0-9-]+)$/);
  assert(match, 404, 'NOT_FOUND', 'Problem not found.');
  const problem = await env.DB.prepare(
    "SELECT public_json FROM problems WHERE id=? AND status='active'",
  )
    .bind(match[1])
    .first<{ public_json: string }>();
  assert(problem, 404, 'NOT_FOUND', 'Problem not found.');
  if (req.method === 'GET') {
    await env.DB.prepare(
      'INSERT OR IGNORE INTO exposure(user_id,problem_id,revealed_at) VALUES (?,?,?)',
    )
      .bind(user.id, match[1], Date.now())
      .run();
    const progress = await env.DB.prepare(
      'SELECT source,status,updated_at FROM practice_progress WHERE user_id=? AND problem_id=?',
    )
      .bind(user.id, match[1])
      .first();
    return json({ problem: JSON.parse(problem.public_json), progress });
  }
  assert(req.method === 'POST', 405, 'METHOD', 'Method not allowed.');
  const data = await body(req, 70000);
  assert(
    typeof data.source === 'string' && new TextEncoder().encode(data.source).length <= 64000,
    400,
    'SOURCE_LIMIT',
    'Use up to 64,000 bytes of Python.',
  );
  assert(
    ['attempted', 'examples_passed'].includes(data.status),
    400,
    'INVALID_STATUS',
    'Invalid practice status.',
  );
  await env.DB.batch([
    env.DB.prepare(
      'INSERT INTO practice_progress(user_id,problem_id,source,status,updated_at) VALUES (?,?,?,?,?) ON CONFLICT(user_id,problem_id) DO UPDATE SET source=excluded.source,status=excluded.status,updated_at=excluded.updated_at',
    ).bind(user.id, match[1], data.source, data.status, Date.now()),
    // Practice reveals the problem; future duels should avoid prior exposure.
    env.DB.prepare(
      'INSERT OR IGNORE INTO exposure(user_id,problem_id,revealed_at) VALUES (?,?,?)',
    ).bind(user.id, match[1], Date.now()),
  ]);
  return json({ saved: true });
}
