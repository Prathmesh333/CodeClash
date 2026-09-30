PRAGMA foreign_keys = ON;
CREATE TABLE users (
 id TEXT PRIMARY KEY, auth_subject TEXT UNIQUE NOT NULL, username TEXT UNIQUE NOT NULL,
 rating INTEGER NOT NULL DEFAULT 1200, wins INTEGER NOT NULL DEFAULT 0 CHECK(wins>=0),
 losses INTEGER NOT NULL DEFAULT 0 CHECK(losses>=0), draws INTEGER NOT NULL DEFAULT 0 CHECK(draws>=0),
 games_played INTEGER NOT NULL DEFAULT 0, rating_version INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL
);
CREATE TABLE sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires_at INTEGER NOT NULL);
CREATE TABLE oauth_states (state_hash TEXT PRIMARY KEY, expires_at INTEGER NOT NULL);
CREATE TABLE problems (id TEXT PRIMARY KEY, version INTEGER NOT NULL DEFAULT 1, status TEXT NOT NULL DEFAULT 'active', public_json TEXT NOT NULL, private_json TEXT NOT NULL, license TEXT NOT NULL DEFAULT 'Original - project owned');
CREATE TABLE exposure (user_id TEXT NOT NULL REFERENCES users(id), problem_id TEXT NOT NULL REFERENCES problems(id), revealed_at INTEGER NOT NULL, PRIMARY KEY(user_id,problem_id));
CREATE TABLE matches (id TEXT PRIMARY KEY, problem_id TEXT NOT NULL REFERENCES problems(id), mode TEXT NOT NULL, player_a TEXT NOT NULL REFERENCES users(id), player_b TEXT NOT NULL REFERENCES users(id), created_at INTEGER NOT NULL, finished_at INTEGER, outcome_json TEXT, CHECK(player_a<>player_b));
CREATE TABLE settlements (match_id TEXT PRIMARY KEY REFERENCES matches(id), digest TEXT NOT NULL, rated INTEGER NOT NULL CHECK(rated IN (0,1)), a TEXT NOT NULL REFERENCES users(id), b TEXT NOT NULL REFERENCES users(id), rating_a INTEGER NOT NULL, rating_b INTEGER NOT NULL, version_a INTEGER NOT NULL, version_b INTEGER NOT NULL, delta_a INTEGER NOT NULL, score_a REAL NOT NULL CHECK(score_a IN (0,0.5,1)), created_at INTEGER NOT NULL);
CREATE TABLE rating_events (match_id TEXT NOT NULL REFERENCES matches(id), user_id TEXT NOT NULL REFERENCES users(id), rating_before INTEGER NOT NULL, delta INTEGER NOT NULL, rating_after INTEGER NOT NULL, PRIMARY KEY(match_id,user_id), CHECK(rating_before+delta=rating_after));
CREATE TRIGGER settle_ratings AFTER INSERT ON settlements WHEN NEW.rated=1 BEGIN
 SELECT RAISE(ABORT,'participants mismatch') WHERE NOT EXISTS (SELECT 1 FROM matches WHERE id=NEW.match_id AND player_a=NEW.a AND player_b=NEW.b);
 SELECT RAISE(ABORT,'stale rating A') WHERE NOT EXISTS (SELECT 1 FROM users WHERE id=NEW.a AND rating=NEW.rating_a AND rating_version=NEW.version_a);
 SELECT RAISE(ABORT,'stale rating B') WHERE NOT EXISTS (SELECT 1 FROM users WHERE id=NEW.b AND rating=NEW.rating_b AND rating_version=NEW.version_b);
 INSERT INTO rating_events VALUES (NEW.match_id,NEW.a,NEW.rating_a,NEW.delta_a,NEW.rating_a+NEW.delta_a);
 INSERT INTO rating_events VALUES (NEW.match_id,NEW.b,NEW.rating_b,-NEW.delta_a,NEW.rating_b-NEW.delta_a);
 UPDATE users SET rating=rating+NEW.delta_a,rating_version=rating_version+1,games_played=games_played+1,wins=wins+(NEW.score_a=1),losses=losses+(NEW.score_a=0),draws=draws+(NEW.score_a=0.5) WHERE id=NEW.a;
 UPDATE users SET rating=rating-NEW.delta_a,rating_version=rating_version+1,games_played=games_played+1,wins=wins+(NEW.score_a=0),losses=losses+(NEW.score_a=1),draws=draws+(NEW.score_a=0.5) WHERE id=NEW.b;
END;
CREATE INDEX leaderboard ON users(rating DESC,id);
CREATE INDEX history_a ON matches(player_a,finished_at DESC);
CREATE INDEX history_b ON matches(player_b,finished_at DESC);
CREATE INDEX session_expiry ON sessions(expires_at);
