-- Durable submission audit trail. Required by docs/04: every accepted run and submit is recorded
-- with its authoritative receipt order, and replaying a request key cannot create a second row.
CREATE TABLE submissions (
 id TEXT PRIMARY KEY,
 match_id TEXT NOT NULL REFERENCES matches(id),
 user_id TEXT NOT NULL REFERENCES users(id),
 idempotency_key TEXT NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN ('run','submit')),
 language TEXT NOT NULL CHECK(language='python'),
 source TEXT NOT NULL,
 source_hash TEXT NOT NULL,
 receipt_ms INTEGER NOT NULL,
 receipt_seq INTEGER NOT NULL,
 job_id TEXT,
 attempt_token TEXT,
 verdict TEXT NOT NULL CHECK(verdict IN ('PENDING','AC','WA','RE','TLE','MLE','OLE','JUDGE_ERROR')),
 runtime_ms INTEGER,
 peak_memory_bytes INTEGER,
 created_at INTEGER NOT NULL,
 UNIQUE(match_id,user_id,idempotency_key),
 UNIQUE(match_id,receipt_seq)
);
CREATE INDEX submissions_by_match ON submissions(match_id,receipt_seq);
CREATE INDEX submissions_by_user ON submissions(user_id,created_at);
