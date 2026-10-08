import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('cloudflare:workers', () => ({
  DurableObject: class {
    ctx: any;
    env: any;
    constructor(ctx: any, env: any) {
      this.ctx = ctx;
      this.env = env;
    }
  },
}));
import { MatchDO } from '../../apps/worker/src/match';
import { newGame, type Game, type User } from '../../packages/shared/game';

function fixture() {
  const records = new Map<string, any>();
  let alarm: number | undefined;
  const storage: any = {
    get: async (key: string) => structuredClone(records.get(key)),
    put: async (key: string, value: any) => {
      if (JSON.stringify(value).length > 2_000_000) throw new Error('Record too large');
      records.set(key, structuredClone(value));
    },
    setAlarm: async (t: number) => {
      alarm = t;
    },
    deleteAlarm: async () => {
      alarm = undefined;
    },
    transaction: async (fn: any) => fn(storage),
  };
  let databaseDown = false;
  let problemTitle = 'Original';
  const rows = new Map<string, any>();
  const env: any = {
    DB: {
      prepare: () => ({
        bind: (...values: any[]) => ({
          run: async () => {
            if (databaseDown) throw new Error('D1 unavailable');
            rows.set(values[0], values);
          },
          first: async () => ({
            public_json: JSON.stringify({ title: problemTitle, examples: [] }),
            private_json: '[]',
          }),
        }),
      }),
    },
  };
  const ctx: any = {
    storage,
    blockConcurrencyWhile: async (fn: any) => fn(),
    getWebSockets: () => [],
    waitUntil: () => {},
  };
  const room = new MatchDO(ctx, env);
  const users = ['a', 'b'].map((id) => ({
    id,
    username: id,
    rating: 1200,
    rating_version: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    games_played: 0,
  })) as [User, User];
  const game = newGame('room', users, 'problem', Date.now());
  game.phase = 'ACTIVE';
  game.startedAt = Date.now();
  game.endsAt = Date.now() + 1_200_000;
  return {
    room,
    ctx,
    game,
    records,
    rows,
    storage,
    env,
    changeProblem: () => {
      problemTitle = 'Changed';
    },
    alarm: () => alarm,
    down: (value: boolean) => {
      databaseDown = value;
    },
  };
}
describe('durable room recovery', () => {
  it('refuses another participant’s room even with a forged player header', async () => {
    const f = fixture();
    await f.storage.put('game', f.game);
    const response = await f.room.fetch(
      new Request('https://room/snapshot', { headers: { 'X-Player': 'outsider' } }),
    );
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ code: 'FORBIDDEN' });
  });
  it('stores maximum-length sources outside the bounded room record and restores example output', async () => {
    const f = fixture();
    f.game.submissions = Array.from({ length: 100 }, (_, i) => ({
      id: String(i),
      userId: 'a',
      key: 'key-' + i,
      kind: 'run' as const,
      source: 'x'.repeat(65536),
      sourceHash: 'hash',
      receiptMs: i,
      seq: i + 1,
      verdict: 'WA' as const,
      attempt: 1,
      output: 'y'.repeat(65536),
    }));
    await f.room.save(f.game);
    expect(JSON.stringify(f.records.get('game')).length).toBeLessThan(50000);
    expect(f.records.get('source:99')).toHaveLength(65536);
    expect(f.records.get('output:99')).toHaveLength(65536);
    expect((await f.room.snapshot(f.game, 'a')).submissions[99].output).toHaveLength(2048);
  });
  it('retains a receipt across failed D1 writes and replays its stable ID once D1 recovers', async () => {
    const f = fixture();
    f.game.submissions = [
      {
        id: 'stable',
        userId: 'a',
        key: 'request-key',
        kind: 'submit',
        source: 'print(1)',
        sourceHash: 'hash',
        receiptMs: 1,
        seq: 1,
        verdict: 'PENDING',
        attempt: 0,
        auditPending: true,
      },
    ];
    await f.room.save(f.game);
    f.down(true);
    await expect(f.room.project(f.game)).rejects.toThrow('D1 unavailable');
    const recovered = (await f.storage.get('game')) as Game;
    expect(recovered.submissions[0].auditPending).toBe(true);
    expect(f.alarm()).toBeGreaterThan(Date.now());
    f.down(false);
    await f.room.project(recovered);
    await f.room.project(recovered);
    await f.room.save(recovered);
    expect([...f.rows.keys()]).toEqual(['stable']);
    expect(f.rows.get('stable')[6]).toBe('print(1)');
    expect(f.records.get('game').submissions[0].auditPending).toBe(false);
  });
  it('keeps the selected problem immutable after its initial snapshot', async () => {
    const f = fixture();
    const original = await f.room.problem(f.game);
    expect(original.public_json).toContain('Original');
    f.changeProblem();
    expect(await f.room.problem(f.game)).toEqual(original);
  });
  it('does not busy-loop on an elapsed match cutoff while resolving', async () => {
    const f = fixture();
    f.game.phase = 'RESOLVING';
    f.game.endsAt = Date.now() - 1000;
    f.game.players.forEach((p) => (p.lastSeen = Date.now() - 40000));
    f.game.resolutionAt = Date.now();
    await f.room.save(f.game);
    expect(f.alarm()! - Date.now()).toBeGreaterThan(50000);
  });
  it('rearms its alarm when an unexpected dependency failure interrupts recovery', async () => {
    const f = fixture();
    f.game.phase = 'COUNTDOWN';
    f.game.startedAt = Date.now() - 1;
    await f.room.save(f.game);
    await f.room.alarm();
    expect(f.alarm()! - Date.now()).toBeGreaterThan(2000);
  });
  it('commits verdicts despite D1 failure and preserves receipt order across reversed callbacks', async () => {
    const f = fixture();
    const now = Date.now();
    f.game.submissions = ['a', 'b'].map((userId, i) => ({
      id: userId,
      userId,
      key: 'request-' + userId,
      kind: 'submit',
      source: 'print(1)',
      sourceHash: 'hash',
      receiptMs: now + i,
      seq: i + 1,
      verdict: 'PENDING',
      attempt: 1,
      auditPending: true,
    }));
    await f.room.save(f.game);
    f.down(true);
    f.env.JUDGE = { fetch: vi.fn(async () => Response.json({ verdict: 'AC', runtimeMs: 1 })) };
    vi.spyOn(f.room, 'settle').mockResolvedValue(undefined);
    await f.room.execute({ ...f.game.submissions[1] });
    expect(f.records.get('game').phase).toBe('RESOLVING');
    await f.room.execute({ ...f.game.submissions[0] });
    expect(f.records.get('game').outcome.winnerId).toBe('a');
    expect(f.records.get('game').submissions.every((s: any) => s.auditPending)).toBe(true);
    expect(JSON.parse(f.env.JUDGE.fetch.mock.calls[0][1].body).source).toBe('print(1)');
    const snapshot = await f.room.snapshot(f.records.get('game'), 'b');
    expect(snapshot.submissions).toHaveLength(1);
    expect(JSON.stringify(snapshot)).not.toContain('print(1)');
    f.down(false);
    await f.room.project(f.records.get('game'));
    expect(f.rows.size).toBe(2);
  });
  it('closes a socket when its session has been revoked', async () => {
    const f = fixture();
    f.env.DB.prepare = () => ({ bind: () => ({ first: async () => null }) });
    const ws: any = {
      deserializeAttachment: () => ({
        uid: 'a',
        expiresAt: Date.now() + 10000,
        sessionHash: 'revoked',
      }),
      close: vi.fn(),
      serializeAttachment: vi.fn(),
    };
    await f.room.webSocketMessage(ws, JSON.stringify({ protocolVersion: 1, type: 'client.ping' }));
    expect(ws.close).toHaveBeenCalledWith(1008, 'Session expired');
  });
  it('does not broadcast private snapshots to a revoked silent socket', async () => {
    const f = fixture();
    f.env.DB.prepare = () => ({ bind: () => ({ first: async () => null }) });
    const ws: any = {
      deserializeAttachment: () => ({
        uid: 'a',
        expiresAt: Date.now() + 10000,
        sessionHash: 'revoked',
      }),
      close: vi.fn(),
      send: vi.fn(),
    };
    f.ctx.getWebSockets = () => [ws];
    await f.room.broadcast(f.game);
    expect(ws.close).toHaveBeenCalledWith(1008, 'Session refresh required');
    expect(ws.send).not.toHaveBeenCalled();
  });
  it('rejects flooded socket frames before database work, and resets the window', async () => {
    const f = fixture();
    const first = vi.fn().mockResolvedValue(null);
    f.env.DB.prepare = vi.fn(() => ({ bind: () => ({ first }) }));
    let attachment = {
      uid: 'a',
      expiresAt: Date.now() + 60000,
      sessionHash: 'x',
      messageWindow: Date.now(),
      messageCount: 12,
    };
    const ws: any = {
      deserializeAttachment: () => attachment,
      serializeAttachment: (next: typeof attachment) => {
        attachment = next;
      },
      close: vi.fn(),
    };
    await f.room.webSocketMessage(ws, JSON.stringify({ protocolVersion: 1, type: 'client.ping' }));
    expect(ws.close).toHaveBeenCalledWith(1008, 'Message rate exceeded');
    expect(first).not.toHaveBeenCalled();
    attachment.messageWindow = Date.now() - 11000;
    await f.room.webSocketMessage(ws, JSON.stringify({ protocolVersion: 1, type: 'client.ping' }));
    expect(first).toHaveBeenCalledOnce();
    expect(attachment.messageCount).toBe(1);
  });
});
