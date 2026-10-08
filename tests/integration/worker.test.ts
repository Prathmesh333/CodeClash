// Integration suite against a real local Worker: real routing, real Durable Objects with WebSocket
// hibernation, real D1 with the production migration and settlement triggers. No mock database and
// no injected verdict; rows are read back from D1 to prove what was actually persisted.
// Each test signs in its own accounts so tickets, rooms and ratings cannot leak between tests.
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { pairUp, startArena, testState, waitFor, type Arena, type Evidence } from './harness.ts';

let arena: Arena;
before(async () => { arena = await startArena(); }, { timeout: 180000 });
after(async () => { await arena?.stop(); });

let counter = 0;
/** Two fresh accounts for one test. */
const pair = async () => {
  counter += 1;
  const first = `player-${String(counter * 2 - 1).padStart(2, '0')}`;
  const second = `player-${String(counter * 2).padStart(2, '0')}`;
  return { a: await arena.signIn(first), b: await arena.signIn(second) };
};

describe('authoritative match lifecycle', () => {
  it('pairs two sessions, honours the countdown and reveals one identical problem version', async () => {
    const { a, b } = await pair();
    const { matchId, snapshot } = await pairUp(arena, a, b);
    assert.equal(snapshot.phase, 'COUNTDOWN', 'both acknowledgements must start the countdown');
    assert.ok(snapshot.startedAt && snapshot.startedAt >= snapshot.createdAt + 2000, 'the countdown must be scheduled by the server');
    assert.equal(snapshot.problem, undefined, 'no problem may be visible before the authoritative start');
    const revealedA = await waitFor(arena, a, matchId, s => Boolean(s.problem));
    const revealedB = await waitFor(arena, b, matchId, s => Boolean(s.problem));
    assert.equal(revealedA.phase, 'ACTIVE');
    assert.equal(revealedA.problem!.difficulty, 'Easy', 'new accounts should receive an unseen Easy problem while available');
    assert.equal(revealedA.problem!.id, revealedB.problem!.id, 'both players must receive the same problem');
    assert.equal(revealedA.problem!.version, revealedB.problem!.version);
    assert.equal(revealedA.startedAt, revealedB.startedAt, 'the clock is server authoritative');
    assert.equal(revealedA.endsAt! - revealedA.startedAt!, 1_200_000, 'matches run for 20 minutes from the authoritative start');
    assert.equal(new Set(revealedA.players.map(p => p.id)).size, 2, 'a match needs two distinct players');
  });

  it('restores authoritative state after a reconnect and never leaks private fields', async () => {
    const { a, b } = await pair();
    const { matchId } = await pairUp(arena, a, b);
    const before = await waitFor(arena, a, matchId, s => Boolean(s.problem));
    // A reconnect is a fresh request with the same session: no client state is trusted.
    const reconnected = await arena.call(a, `/match/${matchId}`);
    assert.equal(reconnected.status, 200);
    assert.equal(reconnected.body.phase, before.phase);
    assert.equal(reconnected.body.problem.id, before.problem!.id);
    const payload = JSON.stringify(reconnected.body);
    assert.equal(payload.includes('source'), false, 'sources must never reach a client');
    assert.equal(payload.includes('private'), false);
    assert.equal(payload.includes('referenceSolution'), false);
    assert.equal(payload.includes('editorial'), false);
    assert.equal('tests' in reconnected.body.problem, false);
    assert.equal(payload.includes(a.id) && payload.includes('submissions') && reconnected.body.submissions.length > 0, false, 'submissions are private to their author');
    const otherView = await arena.call(b, `/match/${matchId}`);
    assert.equal(otherView.body.problem.id, before.problem!.id);
  });

  it('refuses non-participants, anonymous callers and cross-origin mutations', async () => {
    const { a, b } = await pair();
    const outsider = await arena.signIn('cora');
    const { matchId } = await pairUp(arena, a, b);
    const foreign = await arena.call(outsider, `/match/${matchId}`);
    assert.equal(foreign.status, 403);
    assert.equal(foreign.body.code, 'FORBIDDEN');
    const anonymous = await arena.call(null, `/match/${matchId}`);
    assert.equal(anonymous.status, 401);
    const crossOrigin = await arena.call(a, `/match/${matchId}/ready`, {}, { Origin: 'https://evil.example' });
    assert.equal(crossOrigin.status, 403);
    assert.equal(crossOrigin.body.code, 'ORIGIN_DENIED');
    const missing = await arena.call(a, '/api/match/not-a-real-match');
    assert.equal(missing.status, 404);
    await arena.call(a, `/match/${matchId}/forfeit`, {});
  });

  it('returns the same queue ticket and the same match when a player joins twice', async () => {
    const { a, b } = await pair();
    const first = await arena.call(a, '/matchmaking/join', {});
    const again = await arena.call(a, '/matchmaking/join', {});
    assert.equal(first.body.state, 'QUEUED');
    assert.equal(again.body.state, 'QUEUED');
    assert.equal(again.body.joinedAt, first.body.joinedAt, 'a repeated join must not restart the ticket');
    const paired = await arena.call(b, '/matchmaking/join', {});
    assert.ok(paired.body.matchId, 'the second player must be paired');
    const status = await arena.call(a, '/matchmaking/status');
    assert.equal(status.body.matchId, paired.body.matchId, 'both players must be in the same room');
    const rejoin = await arena.call(a, '/matchmaking/join', {});
    assert.equal(rejoin.body.matchId, paired.body.matchId, 'joining again must return the assigned match, not a new one');
    const state = await testState(arena);
    assert.equal(state.matches.filter(m => m.player_a === a.id || m.player_b === a.id).length, 1, 'two tabs must not create two rooms');
    await arena.call(a, `/match/${paired.body.matchId}/forfeit`, {});
  });

  it('reports an honest 503 while the isolated judge is not configured', async () => {
    const { a, b } = await pair();
    const { matchId } = await pairUp(arena, a, b);
    await waitFor(arena, a, matchId, s => s.phase === 'ACTIVE');
    const run = await arena.call(a, `/match/${matchId}/run`, { language: 'python', source: 'print(1)', problemVersion: 1 }, { 'Idempotency-Key': 'integration-key-0001' });
    assert.equal(run.status, 503, 'a missing judge must never look like a wrong answer');
    assert.equal(run.body.code, 'JUDGE_UNAVAILABLE');
    assert.match(run.body.message, /not available/i);
    const submit = await arena.call(b, `/match/${matchId}/submit`, { language: 'python', source: 'print(1)', problemVersion: 1 }, { 'Idempotency-Key': 'integration-key-0002' });
    assert.equal(submit.status, 503);
    const state = await testState(arena);
    assert.equal(state.submissions.length, 0, 'rejected submissions must not be recorded');
    const health = await arena.call(null, '/health');
    assert.equal(health.body.judge, 'unavailable');
    // The room must still be playable and both clients must agree.
    const stillActive = await arena.call(a, `/match/${matchId}`);
    assert.equal(stillActive.body.phase, 'ACTIVE');
    await arena.call(a, `/match/${matchId}/forfeit`, {});
  });

  it('rejects malformed submissions and missing idempotency keys before judging', async () => {
    const { a, b } = await pair();
    const { matchId } = await pairUp(arena, a, b);
    await waitFor(arena, a, matchId, s => s.phase === 'ACTIVE');
    const noKey = await arena.call(a, `/match/${matchId}/run`, { language: 'python', source: 'print(1)', problemVersion: 1 });
    assert.equal(noKey.status, 400);
    assert.equal(noKey.body.code, 'MISSING_KEY');
    const badLanguage = await arena.call(a, `/match/${matchId}/run`, { language: 'javascript', source: 'console.log(1)', problemVersion: 1 }, { 'Idempotency-Key': 'integration-key-0003' });
    assert.equal(badLanguage.status, 400);
    assert.equal(badLanguage.body.code, 'INVALID_SUBMISSION');
    const badVersion = await arena.call(a, `/match/${matchId}/run`, { language: 'python', source: 'print(1)', problemVersion: 2 }, { 'Idempotency-Key': 'integration-key-0004' });
    assert.equal(badVersion.status, 400);
    const empty = await arena.call(a, `/match/${matchId}/run`, { language: 'python', source: '', problemVersion: 1 }, { 'Idempotency-Key': 'integration-key-0005' });
    assert.equal(empty.status, 400);
    await arena.call(a, `/match/${matchId}/forfeit`, {});
  });

  it('cancels a match with no rating when a player leaves before the start', async () => {
    const { a, b } = await pair();
    // Forfeit before either player acknowledges, so the room is still WAITING_READY.
    await arena.call(a, '/matchmaking/join', {});
    const paired = await arena.call(b, '/matchmaking/join', {});
    const matchId = paired.body.matchId as string;
    assert.ok(matchId, 'the two accounts must be paired into a room');
    const waiting = await arena.call(a, `/match/${matchId}`);
    assert.equal(waiting.body.phase, 'WAITING_READY');
    const before = await testState(arena);
    const forfeit = await arena.call(b, `/match/${matchId}/forfeit`, {});
    assert.equal(forfeit.body.phase, 'CANCELLED');
    assert.equal(forfeit.body.outcome.rated, false, 'a cancelled match never changes ratings');
    assert.equal(forfeit.body.outcome.winnerId, null);
    const after = await testState(arena);
    assert.equal(after.ratingEvents.length, before.ratingEvents.length, 'a cancelled match must not create rating events');
    const settlement = after.settlements.filter(row => row.match_id === matchId);
    assert.deepEqual(settlement.map(row => row.rated), [0], 'a cancelled match may be recorded, but never as rated');
    const users = after.users.filter(row => row.id === a.id || row.id === b.id);
    for (const user of users) {
      const original = before.users.find(row => row.id === user.id)!;
      assert.equal(user.rating, original.rating, 'a cancelled match leaves ratings untouched');
      assert.equal(user.games_played, original.games_played, 'a cancelled match is not a ranked game');
    }
  });
});

describe('settlement integrity', () => {
  it('applies exactly one rating update for a forfeit and keeps the result immutable', async () => {
    const { a, b } = await pair();
    const { matchId } = await pairUp(arena, a, b);
    await waitFor(arena, a, matchId, s => s.phase === 'ACTIVE');
    assert.equal((await arena.call(a, `/match/${matchId}/claim`, {})).status, 403, 'ranked matches must reject browser verdicts');
    const before = await testState(arena);
    const beforeA = before.users.find(row => row.id === a.id)!;
    const beforeB = before.users.find(row => row.id === b.id)!;
    const forfeit = await arena.call(a, `/match/${matchId}/forfeit`, {});
    assert.equal(forfeit.status, 200);
    assert.equal(forfeit.body.phase, 'FINISHED');
    assert.equal(forfeit.body.outcome.winnerId, b.id, 'the remaining player wins a forfeit');
    assert.equal(forfeit.body.outcome.rated, true);
    const settled = await waitFor(arena, b, matchId, s => s.settled === true);
    assert.equal(settled.outcome!.winnerId, b.id, 'both clients must see the same immutable outcome');
    // A second forfeit and a late read must not change the stored result.
    const replay = await arena.call(a, `/match/${matchId}/forfeit`, {});
    assert.equal(replay.body.outcome.winnerId, b.id);
    const rows = (await testState(arena)).settlements.filter(row => row.match_id === matchId);
    assert.equal(rows.length, 1, 'exactly one settlement row per match');
    assert.equal(rows[0].rated, 1);
    assert.equal(rows[0].delta_a, -16, 'equal rated players exchange 16 points');
    assert.equal(rows[0].b, b.id, 'the winner is recorded as player b');
    const events = (await testState(arena)).ratingEvents.filter(row => row.match_id === matchId);
    assert.equal(events.length, 2, 'each player gets exactly one rating event');
    const afterA = (await testState(arena)).users.find(row => row.id === a.id)!;
    const afterB = (await testState(arena)).users.find(row => row.id === b.id)!;
    assert.equal(afterA.rating - beforeA.rating, -16);
    assert.equal(afterB.rating - beforeB.rating, 16);
    assert.equal(afterA.games_played - beforeA.games_played, 1);
    assert.equal(afterB.games_played - beforeB.games_played, 1);
    assert.equal(afterA.losses - beforeA.losses, 1);
    assert.equal(afterB.wins - beforeB.wins, 1);
    const match = (await testState(arena)).matches.find(row => row.id === matchId)!;
    assert.ok(match.finished_at, 'the match row must be closed');
    assert.equal(JSON.parse(match.outcome_json!).winnerId, b.id);
    // Other lifecycle tests intentionally leave live matches; those are not integrity failures.
    const { openMatches, ...integrity } = (await testState(arena)).invariants;
    assert.ok(openMatches >= 0);
    assert.deepEqual(integrity, {
      duplicateSettlements: 0, ratingEventArithmeticErrors: 0, orphanRatingEvents: 0,
      eventsWithoutRatedSettlement: 0, ratedSettlementsWithoutEvents: 0, selfMatches: 0,
      duplicateSubmissions: 0, duplicateReceiptOrder: 0, submissionsInUnknownMatch: 0,
    }, 'no invariant may be violated at any point');
  });

  it('never lets one account hold two active matches', async () => {
    const { a, b } = await pair();
    const first = await pairUp(arena, a, b);
    // A second sign-in for the same account, in another context, must land in the same room.
    const secondSession = await arena.signIn(a.id);
    const rejoined = await arena.call(secondSession, '/matchmaking/join', {});
    assert.equal(rejoined.body.matchId, first.matchId, 'a second session must rejoin the open match');
    const state = await testState(arena);
    const open = state.matches.filter(m => !m.finished_at && (m.player_a === a.id || m.player_b === a.id));
    assert.equal(open.length, 1, 'an account can only be in one open room');
    assert.equal(state.invariants.selfMatches, 0, 'a player can never face themselves');
    await arena.call(a, `/match/${first.matchId}/forfeit`, {});
    const finished = await testState(arena);
    assert.equal(finished.matches.filter(m => m.player_a === b.id && !m.finished_at).length, 0);
  });

  it('keeps rating events in exact agreement with rated settlements', async () => {
    const state = await testState(arena);
    assert.equal(state.invariants.duplicateSettlements, 0, 'no match may settle twice');
    for (const row of state.users) {
      const events = state.ratingEvents.filter(event => event.user_id === row.id).length;
      const rated = state.settlements.filter(s => s.rated === 1 && (s.a === row.id || s.b === row.id)).length;
      assert.equal(events, rated, `account ${row.id} must have one rating event per rated settlement`);
    }
    for (const settlement of state.settlements.filter(s => s.rated === 1)) {
      const events = state.ratingEvents.filter(event => event.match_id === settlement.match_id);
      const total = events.reduce((sum, event) => sum + event.delta, 0);
      assert.equal(total, 0, 'a rated settlement must move zero net rating');
      for (const event of events) {
        assert.equal(event.rating_before + event.delta, event.rating_after, 'stored rating arithmetic must hold');
      }
    }
  });

  it('reports rating, wins, history and a deterministic leaderboard', async () => {
    const { a, b } = await pair();
    const { matchId } = await pairUp(arena, a, b);
    await waitFor(arena, a, matchId, s => s.phase === 'ACTIVE');
    await arena.call(a, `/match/${matchId}/forfeit`, {});
    await waitFor(arena, a, matchId, s => s.settled === true);
    const profile = await arena.call(b, '/me');
    assert.equal(profile.status, 200);
    assert.equal(profile.body.user.id, b.id);
    assert.ok(profile.body.user.rating > 1200, 'a win must raise the rating');
    assert.equal(profile.body.user.wins, 1);
    const history = await arena.call(b, '/matches');
    assert.equal(history.status, 200);
    assert.ok(history.body.matches.length >= 1, 'finished matches must be listed');
    for (const match of history.body.matches) {
      assert.ok(match.problemTitle, 'history rows carry a problem title');
      assert.notEqual(JSON.parse(match.outcome_json).winnerId, undefined);
    }
    assert.equal((await arena.call(null, '/leaderboard')).status, 401);
    const leaderboard = await arena.call(b, '/leaderboard');
    assert.equal(leaderboard.status, 200);
    const players = leaderboard.body.players;
    const ratings = players.map((p: any) => p.rating);
    assert.deepEqual(ratings, [...ratings].sort((x: number, y: number) => y - x), 'leaderboard is ordered by rating descending');
    for (let index = 1; index < players.length; index += 1) {
      if (players[index - 1].rating === players[index].rating) {
        assert.ok(players[index - 1].id < players[index].id, 'ties break deterministically by user id');
      }
    }
    const paged = await arena.call(b, '/leaderboard?offset=0');
    assert.deepEqual(paged.body.players.map((p: any) => p.id), players.map((p: any) => p.id), 'leaderboard order is stable');
  });
});

describe('session and route boundaries', () => {
  it('invalidates a session on sign out and refuses the old cookie afterwards', async () => {
    const a = await arena.signIn('player-31');
    const before = await arena.call(a, '/me');
    assert.equal(before.body.user.id, 'player-31');
    await arena.call(a, '/auth/logout', {});
    const after = await arena.call(a, '/me');
    assert.equal(after.body.user, null, 'a signed-out session must not resolve to a user');
    const denied = await arena.call(a, '/matchmaking/join', {});
    assert.equal(denied.status, 401);
  });

  it('rejects forged session cookies without creating an account', async () => {
    const forged = { id: 'mallory', cookie: 'rdsa_session=' + 'f'.repeat(64) };
    const profile = await arena.call(forged, '/me');
    assert.equal(profile.body.user, null);
    const state = await testState(arena);
    assert.equal(state.users.filter(row => row.id === 'mallory').length, 0, 'a forged cookie must never provision an account');
    const oversized = { id: 'mallory', cookie: 'rdsa_session=' + 'a'.repeat(200) };
    const rejected = await arena.call(oversized, '/me');
    assert.equal(rejected.body.user, null);
  });

  it('serves health without a session and does not leak unknown routes', async () => {
    const health = await arena.call(null, '/health');
    assert.equal(health.status, 200);
    assert.equal(health.body.local, true);
    const anonymous = await arena.call(null, '/nope');
    assert.equal(anonymous.status, 401, 'route existence must not leak to anonymous callers');
    const session = await arena.signIn('player-32');
    const unknown = await arena.call(session, '/nope');
    assert.equal(unknown.status, 404);
    assert.equal(unknown.body.code, 'NOT_FOUND');
    const wrongMethod = await arena.call(null, '/auth/local', {});
    assert.equal(wrongMethod.status, 400, 'an unusable sign-in payload is rejected with its own code');
    assert.equal(wrongMethod.body.code, 'INVALID_USER');
    const crossOrigin = await arena.call(null, '/auth/local', { id: 'player-01' }, { Origin: 'https://evil.example' });
    assert.equal(crossOrigin.status, 403, 'a cross-origin write is refused before routing');
    assert.equal(crossOrigin.body.code, 'ORIGIN_DENIED');
  });
});
