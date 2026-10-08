export interface Env {
  DB: D1Database;
  MATCHMAKER: DurableObjectNamespace;
  MATCHES: DurableObjectNamespace;
  JUDGE?: Fetcher;
  ASSETS?: Fetcher;
  APP_ENV: string;
  APP_ORIGIN: string;
  JUDGE_ENABLED: string;
  CASUAL_WASM?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  TEST_EVIDENCE?: string;
}
export const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export function assert(
  condition: unknown,
  status: number,
  code: string,
  message: string,
): asserts condition {
  if (!condition) throw new ApiError(status, code, message);
}
export async function hash(value: string) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))]
    .map((n) => n.toString(16).padStart(2, '0'))
    .join('');
}
export async function body(req: Request, max = 70000) {
  const reader = req.body?.getReader();
  if (!reader) return {};
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel();
      throw new ApiError(413, 'TOO_LARGE', 'Request is too large.');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    const parsed = JSON.parse(new TextDecoder().decode(bytes));
    assert(
      parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed),
      400,
      'INVALID_JSON',
      'Provide a JSON object.',
    );
    return parsed;
  } catch {
    throw new ApiError(400, 'INVALID_JSON', 'Invalid JSON.');
  }
}
export async function rateLimit(env: Env, key: string, limit: number, windowMs: number) {
  const bucket = Math.floor(Date.now() / windowMs);
  const admitted = await env.DB.prepare(
    'INSERT INTO auth_rate_limits(key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 WHERE count<? RETURNING count',
  )
    .bind(await hash(`api:${key}:${bucket}`), (bucket + 1) * windowMs, limit)
    .first();
  assert(admitted, 429, 'RATE_LIMITED', 'Too many requests. Please try again later.');
}
export function localRequest(req: Request, env: Env) {
  return (
    env.APP_ENV === 'local' &&
    ['127.0.0.1', 'localhost', '[::1]'].includes(new URL(req.url).hostname)
  );
}
