import { expect, it, vi } from 'vitest';
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
import { MatchmakerDO } from '../../apps/worker/src/matchmaker';
function fixture(tickets: Record<string, unknown> = {}) {
  const records = new Map<string, unknown>([['tickets', tickets]]);
  const get = vi.fn(async (key: string) => structuredClone(records.get(key)));
  const ctx: any = {
    blockConcurrencyWhile: async (fn: any) => fn(),
    storage: {
      get,
      put: async (key: string, value: unknown) => {
        records.set(key, structuredClone(value));
      },
      setAlarm: async () => {},
    },
  };
  const room = new MatchmakerDO(ctx, {} as any);
  return { room, get, records };
}
it('bounds repeated matchmaking status work before reading durable tickets', async () => {
  const f = fixture();
  const request = () =>
    new Request('https://queue', {
      method: 'POST',
      body: JSON.stringify({ action: 'status', user: { id: 'a' } }),
    });
  for (let i = 0; i < 60; i++) expect((await f.room.fetch(request())).status).toBe(200);
  expect((await f.room.fetch(request())).status).toBe(429);
  expect(f.get).toHaveBeenCalledTimes(60);
});
it('rejects excess queue membership instead of exhausting a durable record', async () => {
  const now = Date.now();
  const tickets = Object.fromEntries(
    Array.from({ length: 200 }, (_, i) => [
      String(i),
      { user: { id: String(i) }, joinedAt: now, heartbeat: now },
    ]),
  );
  const f = fixture(tickets);
  const response = await f.room.fetch(
    new Request('https://queue', {
      method: 'POST',
      body: JSON.stringify({ action: 'join', user: { id: 'new' } }),
    }),
  );
  expect(response.status).toBe(503);
  expect(await response.json()).toMatchObject({ code: 'QUEUE_FULL' });
  expect(Object.keys(f.records.get('tickets') as object)).toHaveLength(200);
});
