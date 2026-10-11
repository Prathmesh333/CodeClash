import { after, before, it } from 'node:test';
import assert from 'node:assert/strict';
import { startArena, pairUp, waitFor, type Arena } from './harness.ts';
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
it('practice stores private per-account drafts, exposes no judge fixtures, preserves ratings and exports progress', async () => {
  assert.equal((await arena.call(null, '/practice')).status, 401);
  const a = await arena.signIn('player-29'),
    b = await arena.signIn('player-30');
  const me = (await arena.call(a, '/me')).body;
  const list = await arena.call(a, '/practice');
  assert.equal(list.status, 200);
  assert.equal(list.body.problems.length, 153);
  const id = 'practice-duplicate-manifest';
  const opened = await arena.call(a, '/practice/' + id);
  assert.equal(opened.status, 200);
  assert.equal(opened.body.progress, null);
  assert.ok(!('tests' in opened.body.problem));
  assert.ok(!('referenceSolution' in opened.body.problem));
  assert.equal(
    (await arena.call(a, '/practice/' + id, { source: 'print(true)', status: 'verified' })).status,
    400,
  );
  const source = 'print("draft")';
  assert.equal(
    (await arena.call(a, '/practice/' + id, { source, status: 'examples_passed' })).status,
    200,
  );
  assert.equal((await arena.call(a, '/practice/' + id)).body.progress.source, source);
  assert.equal((await arena.call(b, '/practice/' + id)).body.progress, null);
  assert.deepEqual((await arena.call(a, '/me')).body, me);
  const exported = (await arena.call(a, '/privacy/export')).body.collections;
  assert.ok(exported.practiceProgress.some((p: { source: string }) => p.source === source));
  assert.equal((await arena.call(a, '/practice/not-a-problem')).status, 404);
  assert.equal(
    (await arena.call(a, '/practice/' + id, { source: 'x'.repeat(64001), status: 'attempted' }))
      .status,
    400,
  );
});

it('expanded practice questions do not enter multiplayer selection before review', async () => {
 const a=await arena.signIn('player-27'),b=await arena.signIn('player-28');
 const {matchId}=await pairUp(arena,a,b);
 const state=await waitFor(arena,a,matchId,s=>Boolean(s.problem));
 assert.ok(!state.problem!.id.startsWith('practice-'));
});
