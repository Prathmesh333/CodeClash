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
  const a = await arena.signIn('player-27'),
    b = await arena.signIn('player-28');
  const { matchId } = await pairUp(arena, a, b);
  const state = await waitFor(arena, a, matchId, (s) => Boolean(s.problem));
  assert.ok(!state.problem!.id.startsWith('practice-'));
});

it('practice attempts are private, bounded, replay-safe, and editorial access is blocked in a duel', async () => {
  const a = await arena.signIn('player-25'),
    b = await arena.signIn('player-26');
  const id = 'practice-duplicate-manifest',
    path = '/practice/' + id;
  const before = (await arena.call(a, '/me')).body;
  const key = crypto.randomUUID();
  const payload = {
    id: key,
    source: 'def solve(data): return False',
    executionMode: 'function',
    status: 'examples_passed',
    results: [{ verdict: 'WA', runtimeMs: 5 }],
  };
  assert.equal((await arena.call(a, path + '/attempts', payload)).status, 200);
  assert.equal((await arena.call(a, path + '/attempts', payload)).status, 200);
  const history = (await arena.call(a, path + '/attempts')).body.attempts;
  assert.equal(history.length, 1);
  assert.ok(!('source' in history[0]));
  assert.equal((await arena.call(a, path)).body.progress.execution_mode, 'function');
  assert.equal((await arena.call(a, path)).body.progress.status, 'attempted');
  assert.equal((await arena.call(b, path + '/attempts/' + key)).status, 404);
  assert.equal(
    (await arena.call(a, path + '/attempts/' + key)).body.attempt.source,
    payload.source,
  );
  assert.equal(
    (
      await arena.call(a, path + '/attempts', {
        ...payload,
        id: crypto.randomUUID(),
        results: [{ verdict: 'AC', runtimeMs: 1 }],
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await arena.call(a, path + '/attempts', {
        ...payload,
        id: crypto.randomUUID(),
        results: [{ verdict: 'PASS', runtimeMs: -1 }],
      })
    ).status,
    400,
  );
  const editorial = (await arena.call(a, path + '/editorial')).body.editorial;
  assert.ok(editorial.code.includes('def solve'));
  assert.ok(!('tests' in editorial));
  assert.deepEqual((await arena.call(a, '/me')).body, before);
  assert.equal(
    (await arena.call(a, '/privacy/export')).body.collections.practiceAttempts.length,
    1,
  );
  await pairUp(arena, a, b);
  assert.equal((await arena.call(a, path + '/editorial')).status, 409);
});
it('practice retains the most recent 50 attempts per account and problem', async () => {
  const a = await arena.signIn('player-24'),
    path = '/practice/practice-duplicate-manifest/attempts';
  const ids: string[] = [];
  for (let i = 0; i < 51; i++) {
    const id = crypto.randomUUID();
    ids.push(id);
    assert.equal(
      (
        await arena.call(a, path, {
          id,
          source: '# ' + i,
          status: 'attempted',
          results: [{ verdict: 'RE', runtimeMs: 0 }],
        })
      ).status,
      200,
    );
  }
  const rows = (await arena.call(a, path)).body.attempts;
  assert.equal(rows.length, 50);
  assert.ok(rows.some((r: { id: string }) => r.id === ids[50]));
  assert.ok(!rows.some((r: { id: string }) => r.id === ids[0]));
});
