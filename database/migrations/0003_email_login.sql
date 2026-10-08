CREATE TABLE email_login_links (
 token_hash TEXT PRIMARY KEY,
 email TEXT NOT NULL,
 browser_hash TEXT NOT NULL,
 expires_at INTEGER NOT NULL
);
CREATE INDEX email_login_expiry ON email_login_links(expires_at);
CREATE TABLE auth_rate_limits (
 key TEXT PRIMARY KEY,
 count INTEGER NOT NULL,
 expires_at INTEGER NOT NULL
);
CREATE INDEX auth_rate_expiry ON auth_rate_limits(expires_at);
