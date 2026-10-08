// Browser API client. Every mutation carries an Idempotency-Key where the server needs one, so a
// single transport-level retry cannot create a second submission, queue ticket or forfeit.
const TIMEOUT_MS = 10000;
export async function api<T>(
  path: string,
  data?: unknown,
  key?: string,
  signal?: AbortSignal,
): Promise<T> {
  const send = async () => {
    const response = await fetch('/api' + path, {
      method: data === undefined ? 'GET' : 'POST',
      headers:
        data === undefined
          ? {}
          : { 'Content-Type': 'application/json', ...(key ? { 'Idempotency-Key': key } : {}) },
      body: data === undefined ? undefined : JSON.stringify(data),
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(TIMEOUT_MS)])
        : AbortSignal.timeout(TIMEOUT_MS),
    });
    let payload: T & { message?: string };
    try {
      payload = (await response.json()) as T & { message?: string };
    } catch (cause) {
      if (['TypeError', 'TimeoutError', 'AbortError'].includes((cause as Error)?.name)) throw cause;
      // A proxy can return a plain-text 5xx after losing its upstream connection.
      // Replay only reads, keyed submissions and the server's idempotent queue join.
      const safeToReplay = data === undefined || Boolean(key) || path === '/matchmaking/join';
      const error = new Error('The connection was interrupted. Please try again.');
      error.name = response.status >= 500 && safeToReplay ? 'TransportError' : 'ApiError';
      throw error;
    }
    if (!response.ok) {
      if (
        response.status === 401 &&
        payload.message &&
        path !== '/me' &&
        typeof window !== 'undefined'
      )
        window.dispatchEvent(new Event('codeclash:session-expired'));
      const error = new Error(payload.message ?? 'The server could not complete this request.');
      error.name = 'ApiError';
      throw error;
    }
    return payload;
  };
  try {
    return await send();
  } catch (error) {
    // Retry once for a transport failure. Valid API errors remain authoritative.
    if (signal?.aborted) throw error;
    const name = (error as Error)?.name;
    if (!['TypeError', 'TimeoutError', 'AbortError', 'TransportError'].includes(name)) throw error;
    return await send();
  }
}
