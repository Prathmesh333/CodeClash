CREATE TABLE practice_progress (
 user_id TEXT NOT NULL REFERENCES users(id), problem_id TEXT NOT NULL REFERENCES problems(id),
 source TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'attempted' CHECK(status IN ('attempted','examples_passed')),
 updated_at INTEGER NOT NULL, PRIMARY KEY(user_id,problem_id)
);
CREATE INDEX practice_recent ON practice_progress(user_id,updated_at DESC);
