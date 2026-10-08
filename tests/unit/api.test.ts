import { afterEach, expect, it, vi } from 'vitest';
import { api } from '../../apps/web/src/api';
afterEach(() => vi.unstubAllGlobals());
it('signals an expired session on an authoritative 401 without retrying', async () => {
  const dispatchEvent = vi.fn();
  const fetch = vi
    .fn()
    .mockResolvedValue(Response.json({ message: 'Sign in to enter the arena.' }, { status: 401 }));
  vi.stubGlobal('window', { dispatchEvent });
  vi.stubGlobal('fetch', fetch);
  await expect(api('/matchmaking/join', {})).rejects.toThrow('Sign in to enter the arena.');
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(dispatchEvent).toHaveBeenCalledTimes(1);
  expect(dispatchEvent.mock.calls[0][0].type).toBe('codeclash:session-expired');
});
it('recovers an idempotent queue join after a non-JSON proxy failure', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(new Response('Network connection lost.', { status: 500 }))
    .mockResolvedValueOnce(Response.json({ state: 'QUEUED' }));
  vi.stubGlobal('fetch', fetch);
  expect(await api('/matchmaking/join', {})).toEqual({ state: 'QUEUED' });
  expect(fetch).toHaveBeenCalledTimes(2);
});
it('does not retry an authoritative judge error', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValue(Response.json({ message: 'Judge unavailable' }, { status: 503 }));
  vi.stubGlobal('fetch', fetch);
  await expect(api('/match/id/submit', {}, 'stable-key')).rejects.toThrow('Judge unavailable');
  expect(fetch).toHaveBeenCalledTimes(1);
});
it('does not replay an unkeyed mutation after a malformed response', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response('Upstream failed', { status: 500 }));
  vi.stubGlobal('fetch', fetch);
  await expect(api('/auth/local', { id: 'alice' })).rejects.toThrow('connection was interrupted');
  expect(fetch).toHaveBeenCalledTimes(1);
});
it('bounds a proxy retry to one attempt', async () => {
  const fetch = vi
    .fn()
    .mockImplementation(() => Promise.resolve(new Response('Upstream failed', { status: 502 })));
  vi.stubGlobal('fetch', fetch);
  await expect(api('/matchmaking/join', {})).rejects.toThrow('connection was interrupted');
  expect(fetch).toHaveBeenCalledTimes(2);
});
