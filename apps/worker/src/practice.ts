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
  const match = url.pathname.match(
    /^\/api\/practice\/([a-z0-9-]+)(?:\/(editorial|attempts)(?:\/([a-f0-9-]{36}))?)?$/,
  );
  assert(match, 404, 'NOT_FOUND', 'Problem not found.');
  const problem = await env.DB.prepare(
    "SELECT public_json FROM problems WHERE id=? AND status='active'",
  )
    .bind(match[1])
    .first<{ public_json: string }>();
  assert(problem, 404, 'NOT_FOUND', 'Problem not found.');
  const publicProblem = JSON.parse(problem.public_json);
  if (match[2] === 'editorial') {
    assert(req.method === 'GET' && !match[3], 405, 'METHOD', 'Method not allowed.');
    const active = await env.DB.prepare(
      'SELECT id FROM matches WHERE (player_a=? OR player_b=?) AND finished_at IS NULL LIMIT 1',
    )
      .bind(user.id, user.id)
      .first();
    assert(!active, 409, 'ACTIVE_MATCH', 'Finish your current duel before opening an editorial.');
    await env.DB.prepare(
      'INSERT OR IGNORE INTO exposure(user_id,problem_id,revealed_at) VALUES (?,?,?)',
    )
      .bind(user.id, match[1], Date.now())
      .run();
    const row = await env.DB.prepare(
      'SELECT editorial_json FROM problem_editorials WHERE problem_id=? AND version=?',
    )
      .bind(match[1], publicProblem.version)
      .first<{ editorial_json: string }>();
    assert(row, 404, 'NOT_FOUND', 'Editorial not available.');
    return json({ editorial: JSON.parse(row.editorial_json) });
  }
  if (match[2] === 'attempts' && req.method === 'GET') {
    if (match[3]) {
      const attempt = await env.DB.prepare(
        'SELECT id,source,execution_mode,results_json,created_at FROM practice_attempts WHERE id=? AND user_id=? AND problem_id=?',
      )
        .bind(match[3], user.id, match[1])
        .first();
      assert(attempt, 404, 'NOT_FOUND', 'Attempt not found.');
      return json({ attempt });
    }
    const rows = await env.DB.prepare(
      'SELECT id,execution_mode,results_json,created_at FROM practice_attempts WHERE user_id=? AND problem_id=? ORDER BY created_at DESC,id DESC LIMIT 50',
    )
      .bind(user.id, match[1])
      .all();
    return json({ attempts: rows.results });
  }
  if (req.method === 'GET') {
    assert(!match[2] && !match[3], 404, 'NOT_FOUND', 'Not found.');
    await env.DB.prepare(
      'INSERT OR IGNORE INTO exposure(user_id,problem_id,revealed_at) VALUES (?,?,?)',
    )
      .bind(user.id, match[1], Date.now())
      .run();
    const progress = await env.DB.prepare(
      'SELECT source,status,execution_mode,updated_at FROM practice_progress WHERE user_id=? AND problem_id=?',
    )
      .bind(user.id, match[1])
      .first();
    return json({ problem: JSON.parse(problem.public_json), progress });
  }
  assert(req.method === 'POST', 405, 'METHOD', 'Method not allowed.');
  assert(!match[3], 405, 'METHOD', 'Method not allowed.');
  const data = await body(req, 80000);
  const executionMode = data.executionMode ?? 'script';
  assert(
    ['script', 'function'].includes(executionMode) &&
      (executionMode !== 'function' || publicProblem.matchEligible === false),
    400,
    'INVALID_MODE',
    'Choose a supported execution mode.',
  );
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
  const statements = [];
  if (match[2] === 'attempts') {
    assert(
      typeof data.id === 'string' && /^[a-f0-9-]{36}$/.test(data.id),
      400,
      'INVALID_ID',
      'Invalid attempt ID.',
    );
    assert(
      Array.isArray(data.results) &&
        data.results.length > 0 &&
        data.results.length <= publicProblem.examples.length &&
        data.results.every(
          (r: { verdict?: unknown; runtimeMs?: unknown }) =>
            r &&
            ['PASS', 'WA', 'RE', 'TLE', 'OLE'].includes(String(r.verdict)) &&
            typeof r.runtimeMs === 'number' &&
            Number.isFinite(r.runtimeMs) &&
            r.runtimeMs >= 0 &&
            r.runtimeMs <= 5000,
        ),
      400,
      'INVALID_RESULTS',
      'Invalid local results.',
    );
    const results = data.results.map((r: { verdict: string; runtimeMs: number }) => ({
      verdict: r.verdict,
      runtimeMs: r.runtimeMs,
    }));
    const passed =
      results.length === publicProblem.examples.length &&
      results.every((r: { verdict: string }) => r.verdict === 'PASS');
    data.status = passed ? 'examples_passed' : 'attempted';
    statements.push(
      env.DB.prepare(
        'INSERT OR IGNORE INTO practice_attempts(id,user_id,problem_id,source,execution_mode,results_json,created_at) VALUES (?,?,?,?,?,?,?)',
      ).bind(
        data.id,
        user.id,
        match[1],
        data.source,
        executionMode,
        JSON.stringify(results),
        Date.now(),
      ),
    );
    // Retain the latest 50 local attempts for this account and problem.
    statements.push(
      env.DB.prepare(
        'DELETE FROM practice_attempts WHERE user_id=? AND problem_id=? AND id NOT IN (SELECT id FROM practice_attempts WHERE user_id=? AND problem_id=? ORDER BY created_at DESC,id DESC LIMIT 50)',
      ).bind(user.id, match[1], user.id, match[1]),
    );
  }
  await env.DB.batch([
    ...statements,
    env.DB.prepare(
      'INSERT INTO practice_progress(user_id,problem_id,source,status,updated_at,execution_mode) VALUES (?,?,?,?,?,?) ON CONFLICT(user_id,problem_id) DO UPDATE SET source=excluded.source,status=excluded.status,updated_at=excluded.updated_at,execution_mode=excluded.execution_mode',
    ).bind(user.id, match[1], data.source, data.status, Date.now(), executionMode),
    // Practice reveals the problem; future duels should avoid prior exposure.
    env.DB.prepare(
      'INSERT OR IGNORE INTO exposure(user_id,problem_id,revealed_at) VALUES (?,?,?)',
    ).bind(user.id, match[1], Date.now()),
  ]);
  return json({ saved: true });
}
