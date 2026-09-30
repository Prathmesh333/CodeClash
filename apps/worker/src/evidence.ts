// Read-only test evidence. Enabled only when APP_ENV=local, TEST_EVIDENCE=true and the caller is a
// local request, so it cannot exist in staging or production. It exposes invariant counters and
// projection rows for automated assertions; it never exposes source code, session tokens or secrets.
import { json, type Env } from './env';

type Row = Record<string, unknown>;
const all = async (env: Env, sql: string) => (await env.DB.prepare(sql).all<Row>()).results;

export async function testState(env: Env) {
  const [users, matches, submissions, settlements, ratingEvents] = await Promise.all([
    all(
      env,
      'SELECT id,rating,games_played,wins,losses,draws,rating_version FROM users ORDER BY id LIMIT 500',
    ),
    all(
      env,
      'SELECT id,problem_id,mode,player_a,player_b,created_at,finished_at,outcome_json FROM matches ORDER BY created_at DESC LIMIT 500',
    ),
    all(
      env,
      'SELECT id,match_id,user_id,idempotency_key,kind,language,source_hash,verdict,receipt_ms,receipt_seq,runtime_ms FROM submissions ORDER BY receipt_ms LIMIT 500',
    ),
    all(
      env,
      'SELECT match_id,rated,a,b,rating_a,rating_b,version_a,version_b,delta_a,score_a,digest FROM settlements ORDER BY match_id LIMIT 500',
    ),
    all(
      env,
      'SELECT match_id,user_id,rating_before,delta,rating_after FROM rating_events ORDER BY match_id,user_id LIMIT 1000',
    ),
  ]);
  const events = ratingEvents as {
    match_id: string;
    user_id: string;
    rating_before: number;
    delta: number;
    rating_after: number;
  }[];
  const markers = settlements as { match_id: string; rated: number; a: string; b: string }[];
  const openMatches = (matches as { finished_at: number | null }[]).filter(
    (match) => !match.finished_at,
  );
  const seen = <T>(rows: T[], key: (row: T) => string) => new Set(rows.map(key)).size;
  const countBy = (rows: string[]) => rows.length - new Set(rows).size;
  const matchIds = new Set((matches as { id: string }[]).map((match) => match.id));
  return json({
    ok: true,
    environment: env.APP_ENV,
    judgeConfigured: env.JUDGE_ENABLED === 'true' && Boolean(env.JUDGE),
    users,
    matches,
    submissions,
    settlements,
    ratingEvents,
    invariants: {
      duplicateSettlements: countBy(markers.map((marker) => marker.match_id)),
      ratingEventArithmeticErrors: events.filter(
        (event) => event.rating_before + event.delta !== event.rating_after,
      ).length,
      orphanRatingEvents: events.filter((event) => !matchIds.has(event.match_id)).length,
      eventsWithoutRatedSettlement: events.filter(
        (event) =>
          !markers.some((marker) => marker.match_id === event.match_id && marker.rated === 1),
      ).length,
      ratedSettlementsWithoutEvents: markers.filter(
        (marker) =>
          marker.rated === 1 &&
          ![marker.a, marker.b].every(
            (id) =>
              events.filter((event) => event.match_id === marker.match_id && event.user_id === id)
                .length === 1,
          ),
      ).length,
      selfMatches: (matches as { player_a: string; player_b: string }[]).filter(
        (match) => match.player_a === match.player_b,
      ).length,
      openMatches: openMatches.length,
      duplicateSubmissions: countBy(
        (submissions as { match_id: string; user_id: string; idempotency_key: string }[]).map(
          (row) => `${row.match_id}:${row.user_id}:${row.idempotency_key}`,
        ),
      ),
      duplicateReceiptOrder:
        seen(
          submissions as { match_id: string; receipt_seq: number }[],
          (row) => `${row.match_id}:${row.receipt_seq}`,
        ) < submissions.length
          ? 1
          : 0,
      submissionsInUnknownMatch: (submissions as { match_id: string }[]).filter(
        (row) => !matchIds.has(row.match_id),
      ).length,
    },
  });
}
