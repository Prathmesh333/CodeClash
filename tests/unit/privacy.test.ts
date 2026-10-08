import { it, expect } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { exportData, requestPrivacy } from '../../apps/worker/src/privacy';
import type { Env } from '../../apps/worker/src/env';
import type { User } from '../../packages/shared/game';
it('privacy export excludes other accounts and session secrets, pages records, and deduplicates requests', async () => {
  const db = new DatabaseSync(':memory:');
  for (const file of [
    '0001_initial.sql',
    '0002_submissions.sql',
    '0003_email_login.sql',
    '0004_profiles.sql',
    '0005_privacy_requests.sql',
  ])
    db.exec(readFileSync('database/migrations/' + file, 'utf8'));
  db.exec(
    "INSERT INTO users(id,auth_subject,username,created_at) VALUES('a','a','Alice',0),('b','b','Bob',0);INSERT INTO sessions VALUES('secret-a','a',123),('secret-b','b',123)",
  );
  const env = {
    DB: {
      prepare(sql: string) {
        let args: unknown[] = [];
        return {
          bind(...values: unknown[]) {
            args = values;
            return this;
          },
          async first() {
            return db.prepare(sql).get(...(args as any[])) ?? null;
          },
          async all() {
            return { results: db.prepare(sql).all(...(args as any[])) };
          },
          async run() {
            return db.prepare(sql).run(...(args as any[]));
          },
        };
      },
    },
  } as unknown as Env;
  const a = { id: 'a' } as User,
    b = { id: 'b' } as User;
  const r = (await (
    await requestPrivacy(env, a, { kind: 'erasure', message: 'Remove my data', user_id: 'b' })
  ).json()) as { request: { id: string } };
  const repeat = (await (
    await requestPrivacy(env, a, { kind: 'erasure', message: 'Repeat' })
  ).json()) as { request: { id: string } };
  expect(r.request.id).toBe(repeat.request.id);
  type Export = { collections: { requests: unknown[] }; nextOffset: number | null };
  const other = (await (await exportData(env, b, 0)).json()) as Export;
  expect(other.collections.requests).toHaveLength(0);
  const insert = db.prepare(
    "INSERT INTO privacy_requests(id,user_id,kind,message,status,created_at) VALUES (?,'a','other','handled','resolved',?)",
  );
  for (let i = 0; i < 1001; i++) insert.run('r' + i, i + 1);
  const first = (await (await exportData(env, a, 0)).json()) as Export;
  expect(first.collections.requests).toHaveLength(1000);
  expect(first.nextOffset).toBe(1000);
  expect(JSON.stringify(first)).not.toContain('secret-a');
  expect(JSON.stringify(first)).not.toContain('secret-b');
  const second = (await (await exportData(env, a, 1000)).json()) as Export;
  expect(second.collections.requests).toHaveLength(2);
  expect(second.nextOffset).toBeNull();
  await expect(requestPrivacy(env, a, { kind: 'wrong', message: '' })).rejects.toThrow();
  await expect(
    requestPrivacy(env, a, { kind: 'erasure', message: 'x'.repeat(1001) }),
  ).rejects.toThrow();
  db.close();
});
