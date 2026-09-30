import { after, before, it } from 'node:test';
import assert from 'node:assert/strict';
import { startArena, pairUp, waitFor, testState, type Arena } from './harness.ts';
let arena: Arena;
before(
  async () => {
    arena = await startArena(true);
  },
  { timeout: 180000 },
);
after(async () => {
  await arena?.stop();
});
it('browser reports end casual matches without modifying ratings or ranked statistics', async () => {
  const a = await arena.signIn('alice'),
    b = await arena.signIn('bob'),
    outsider = await arena.signIn('cora');
  const before = await testState(arena);
  const { matchId, snapshot } = await pairUp(arena, a, b);
  assert.equal(snapshot.mode, 'casual');
  assert.equal((await arena.call(a, `/match/${matchId}/claim`, {})).status, 409);
  assert.equal((await arena.call(outsider, `/match/${matchId}/claim`, {})).status, 403);
  await waitFor(arena, a, matchId, (s) => s.phase === 'ACTIVE');
  assert.equal(
    (
      await arena.call(a, `/match/${matchId}/submit`, {
        language: 'python',
        source: 'print(1)',
        problemVersion: 1,
      })
    ).status,
    403,
  );
  const results = await Promise.all(
    [a, b].map((p) => arena.call(p, `/match/${matchId}/claim`, {})),
  );
  assert.ok(results.every((r) => r.status === 200));
  assert.equal(results[0].body.outcome.winnerId, results[1].body.outcome.winnerId);
  const finished = await waitFor(arena, a, matchId, (s) => s.settled === true);
  assert.equal(finished.outcome?.rated, false);
  assert.match(finished.outcome!.reason, /unverified/);
  const after = await testState(arena);
  assert.deepEqual(after.users, before.users);
  assert.equal(after.ratingEvents.length, 0);
  assert.equal(after.settlements.filter((s) => s.match_id === matchId).length, 1);
  const history = await arena.call(a, '/matches');
  assert.ok(
    history.body.matches.some(
      (m: { id: string; mode: string }) => m.id === matchId && m.mode === 'casual',
    ),
  );
});
