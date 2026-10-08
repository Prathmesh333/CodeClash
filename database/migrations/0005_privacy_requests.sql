CREATE TABLE privacy_requests (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES users(id),
 kind TEXT NOT NULL CHECK(kind IN ('access','erasure','correction','objection','restriction','other')),
 message TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','resolved')),
 created_at INTEGER NOT NULL,
 response TEXT,
 resolved_at INTEGER
);
CREATE UNIQUE INDEX privacy_pending_kind ON privacy_requests(user_id,kind) WHERE status='pending';
CREATE INDEX privacy_review_queue ON privacy_requests(status,created_at);
