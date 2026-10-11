ALTER TABLE practice_progress ADD COLUMN execution_mode TEXT NOT NULL DEFAULT 'script' CHECK(execution_mode IN ('script','function'));
CREATE TABLE problem_editorials (
 problem_id TEXT PRIMARY KEY REFERENCES problems(id), version INTEGER NOT NULL, editorial_json TEXT NOT NULL
);
CREATE TABLE practice_attempts (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), problem_id TEXT NOT NULL REFERENCES problems(id),
 source TEXT NOT NULL, execution_mode TEXT NOT NULL CHECK(execution_mode IN ('script','function')),
 results_json TEXT NOT NULL, created_at INTEGER NOT NULL
);
CREATE INDEX practice_attempt_history ON practice_attempts(user_id,problem_id,created_at DESC,id DESC);
