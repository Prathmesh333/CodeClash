import { it as test } from 'vitest';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { updateProfile } from '../../apps/worker/src/profile.ts';
import type { Env } from '../../apps/worker/src/env.ts';
test('profile updates persist and enforce case-insensitive uniqueness across accounts', async () => {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync('database/migrations/0001_initial.sql', 'utf8'));
  db.exec(readFileSync('database/migrations/0004_profiles.sql', 'utf8'));
  db.exec(
    "INSERT INTO users(id,auth_subject,username,created_at) VALUES('a','a','generated-a',0),('b','b','generated-b',0)",
  );
  db.exec(
    "UPDATE users SET wins=3,games_played=5,rating=1350 WHERE id='a'; INSERT INTO sessions VALUES('existing-session','a',9999999999999)",
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
          async run() {
            return db.prepare(sql).run(...(args as any[]));
          },
        };
      },
    },
  } as unknown as Env;
  const profile = { username: 'CodeNinja', bio: 'Python enthusiast', avatar_color: 'purple' };
  assert.equal((await updateProfile(env, 'a', profile)).status, 200);
  assert.equal((await updateProfile(env, 'b', { ...profile, username: 'codeninja' })).status, 409);
  const row = db.prepare('SELECT * FROM users WHERE id=?').get('a')!;
  assert.equal(row.username, 'CodeNinja');
  assert.equal(row.bio, profile.bio);
  assert.equal(row.profile_complete, 1);
  assert.equal(row.rating, 1350);
  assert.equal(row.wins, 3);
  assert.equal(row.games_played, 5);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM sessions').get()!.n, 1);
  await assert.rejects(() => updateProfile(env, 'a', { ...profile, username: 'bad name' }));
  assert.equal((await updateProfile(env, 'a', { ...profile, username: 'NewNinja' })).status, 200);
  assert.equal((await updateProfile(env, 'b', profile)).status, 200);
  db.close();
});
