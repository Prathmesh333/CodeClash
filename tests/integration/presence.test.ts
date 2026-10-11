import { after, before, it } from 'node:test';
import assert from 'node:assert/strict';
import WebSocket from 'ws';
import { startArena, type Arena, type Session } from './harness.ts';
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
it('presence deduplicates tabs, broadcasts queue changes, answers heartbeats and rejects anonymous access', async () => {
  assert.equal((await arena.call(null, '/presence')).status, 401);
  const a = await arena.signIn('player-25'),
    b = await arena.signIn('player-26');
  const sockets: WebSocket[] = [];
  const snapshots = new Map<WebSocket, { online: number; looking: number }>();
  const open = async (session: Session) => {
    const ws = new WebSocket(arena.base.replace('http', 'ws') + '/api/presence', {
      headers: { Cookie: session.cookie, Origin: arena.base },
    });
    sockets.push(ws);
    ws.on('message', (data) => {
      if (String(data) !== 'pong') snapshots.set(ws, JSON.parse(String(data)));
    });
    await new Promise<void>((resolve, reject) => {
      ws.once('open', resolve);
      ws.once('error', reject);
    });
    return ws;
  };
  const wait = async (fn: () => boolean) => {
    for (let i = 0; i < 100; i++) {
      if (fn()) return;
      await new Promise((r) => setTimeout(r, 50));
    }
    assert.fail('presence update timed out: ' + JSON.stringify([...snapshots.values()]));
  };
  try {
    const first = await open(a);
    await wait(() => snapshots.get(first)?.online === 1);
    const tab = await open(a);
    await wait(() => snapshots.get(tab)?.online === 1);
    const second = await open(b);
    await wait(() => snapshots.get(first)?.online === 2);
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('No pong')), 5000);
      first.once('message', (data) => {
        clearTimeout(timeout);
        assert.equal(String(data), 'pong');
        resolve();
      });
      first.send('ping');
    });
    await arena.call(a, '/matchmaking/join', {});
    await wait(() => snapshots.get(first)?.looking === 1);
    await arena.call(a, '/matchmaking/leave', {});
    await wait(() => snapshots.get(first)?.looking === 0);
    tab.close();
    second.close();
    await wait(() => snapshots.get(first)?.online === 1);
  } finally {
    sockets.forEach((ws) => ws.close());
  }
});
