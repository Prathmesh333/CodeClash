ALTER TABLE users ADD COLUMN bio TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN avatar_color TEXT NOT NULL DEFAULT 'blue';
ALTER TABLE users ADD COLUMN profile_complete INTEGER NOT NULL DEFAULT 0;
UPDATE users SET profile_complete=1 WHERE auth_subject LIKE 'local:%';
CREATE UNIQUE INDEX users_username_casefold ON users(username COLLATE NOCASE);
