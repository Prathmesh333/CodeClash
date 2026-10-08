import { assert, json, type Env } from './env';
export function validateProfile(value: unknown) {
  const data = value as { username?: unknown; bio?: unknown; avatar_color?: unknown };
  assert(data && typeof data.username === 'string', 400, 'INVALID_PROFILE', 'Choose a username.');
  const username = data.username.trim();
  assert(
    /^[A-Za-z][A-Za-z0-9_]{2,19}$/.test(username),
    400,
    'INVALID_USERNAME',
    'Use 3–20 letters, numbers, or underscores, starting with a letter.',
  );
  assert(
    !['admin', 'administrator', 'support', 'codeclash', 'moderator', 'system'].includes(
      username.toLowerCase(),
    ),
    400,
    'RESERVED_USERNAME',
    'This username is reserved.',
  );
  assert(
    typeof data.bio === 'string' && data.bio.length <= 160,
    400,
    'INVALID_BIO',
    'Your bio can contain up to 160 characters.',
  );
  assert(
    typeof data.avatar_color === 'string' &&
      ['blue', 'lime', 'purple', 'gold', 'cyan'].includes(data.avatar_color),
    400,
    'INVALID_AVATAR',
    'Choose an avatar color.',
  );
  return { username, bio: data.bio.trim(), avatar_color: data.avatar_color };
}
export async function updateProfile(env: Env, id: string, value: unknown) {
  const profile = validateProfile(value);
  const current = await env.DB.prepare('SELECT username FROM users WHERE id=?')
    .bind(id)
    .first<{ username: string }>();
  if (current?.username !== profile.username) {
    const active = await env.DB.prepare(
      'SELECT id FROM matches WHERE (player_a=? OR player_b=?) AND finished_at IS NULL LIMIT 1',
    )
      .bind(id, id)
      .first();
    assert(
      !active,
      409,
      'MATCH_ACTIVE',
      'Finish your current match before changing your username.',
    );
  }
  try {
    await env.DB.prepare(
      'UPDATE users SET username=?,bio=?,avatar_color=?,profile_complete=1 WHERE id=?',
    )
      .bind(profile.username, profile.bio, profile.avatar_color, id)
      .run();
  } catch (error) {
    if (error instanceof Error && /UNIQUE constraint failed.*users.username/i.test(error.message))
      return json(
        { code: 'USERNAME_TAKEN', message: 'This username is already taken. Choose another.' },
        409,
      );
    throw error;
  }
  return json({ ok: true });
}
