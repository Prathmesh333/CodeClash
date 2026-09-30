# 04 — Database and problem schema

## Conventions

Use opaque text IDs, integer UTC milliseconds, parameterized SQL and explicit foreign keys. Every migration has an ordered filename and is tested on both an empty and previous-release database. Keep live coordination in DO storage; D1 is the persistent query and accounting store. Do not use D1 polling as the match clock.

## Required tables

| Table | Required fields and constraints |
|---|---|
| users | `id` PK, `auth_subject` UNIQUE, `username` UNIQUE, `rating` default 1200, `wins`, `losses`, `draws`, `games_played`, `rating_version`, `created_at`; counters nonnegative |
| problems | `id` PK, `slug` UNIQUE, `status` draft/active/retired, `license`, `source_url`, `created_at` |
| problem_versions | `(problem_id, version)` PK/FK, title, statement, difficulty, topics JSON, input/output specs, public examples JSON, limits JSON, checker_version, runtime_digest, suite_digest; immutable once used |
| problem_test_cases | `id` PK, `(problem_id, version)` FK, ordinal, visibility public/hidden, input_blob, expected_blob, digest; UNIQUE(problem_id,version,ordinal) |
| matches | `id` PK, region, mode ranked/unrated, problem_id/version FK, state, started_at, ends_at, finished_at, outcome, nullable winner_id FK, reason, rules_version, settlement_status, result_digest |
| match_players | `(match_id,user_id)` PK/FKs, slot A/B, rating_before, nullable rating_after, ready_at, disconnected_at; UNIQUE(match_id,slot) |
| submissions | `id` PK, match_id/user_id FK to membership, idempotency_key, kind run/submit, language, source, source_hash, receipt_ms, receipt_seq, job_id, attempt_token, verdict, runtime_ms, peak_memory_bytes, created_at; UNIQUE(match_id,user_id,idempotency_key), UNIQUE(match_id,receipt_seq) |
| rating_events | `(match_id,user_id)` PK/FKs, rating_before, delta, rating_after, expected_rating_version, formula_version, created_at; CHECK(rating_after=rating_before+delta) |
| settlements | `match_id` PK/FK, result_digest, committed_at; one settlement per result |
| player_problem_exposure | `(user_id,problem_id)` PK/FKs, first_revealed_at; problem-level exclusion covers all versions |
| job_audit | `job_id` PK, match_id, submission_id, attempt, status, lease_expires_at, sandbox_id, updated_at; projection for cleanup/operations |

Source storage is private and bounded to 64 KiB UTF-8 per submission. Default retention: delete source and public-run outputs after 7 days, sanitized diagnostic logs after 14 days; retain result/rating ledger for the life of the account under the published deletion policy. Hidden-case blobs are private data and are never selected by public serializers.

Required indexes: users(rating DESC,id), match_players(user_id,match_id), matches(finished_at,id), submissions(match_id,receipt_seq), submissions(user_id,created_at), job_audit(status,lease_expires_at), problem_versions(difficulty), player_problem_exposure(user_id,problem_id). Use query plans and measured rows read to verify index usefulness.

## Problem contract

Default execution interface is a Python program using stdin/stdout, not an arbitrary in-process callback imported by a trusted harness. Example public projection:

```json
{
  "id": "sum-pair",
  "version": 1,
  "title": "Add Two Integers",
  "statement": "Read two integers and print their sum.",
  "difficulty": "easy",
  "topics": ["arrays"],
  "inputFormat": "Two space-separated integers on one line.",
  "outputFormat": "One integer followed by a newline.",
  "constraints": "-1000000 <= a,b <= 1000000",
  "examples": [{"input": "2 3\n", "output": "5\n"}],
  "limits": {"cpuMsPerCase": 2000, "wallMsPerCase": 5000, "memoryMiB": 256},
  "starterCode": "a, b = map(int, input().split())\nprint(a + b)\n"
}
```

This trivial problem is a local smoke fixture, not an adequate ranked bank. Private package adds test inputs, expected outputs, reference solution, slow/incorrect solutions, generator seed, license provenance, suite digest and reviewer approval. Pin all of it before reveal. Default comparator: exact normalized line endings with at most one terminal newline ignored; do not silently ignore all whitespace or coerce values. Any alternate comparator is versioned and independently tested.

## Rating settlement algorithm

Use a single D1 transactional `batch()` for the committed settlement, rating events, user updates and result projection. D1 batch rolls back on statement failure; a conditional UPDATE matching zero rows is not itself a failure. See [D1 database API](https://developers.cloudflare.com/d1/worker-api/d1-database/).

Implementation requirement: use a newly inserted unique settlement marker and database triggers (or another proven atomic design) so replay cannot reapply counters. A recommended migration defines an AFTER INSERT settlement trigger that:

1. Validates exactly two participants, immutable result digest, their current ratings/versions and no existing rating events; mismatches raise a database error.
2. Inserts both rating events using precomputed, independently verified deltas.
3. Updates both users and increments rating_version, games_played and appropriate outcome counters.
4. Updates match_players and marks the result settled.

Insert with conflict-do-nothing on `match_id`. If it already exists, read and compare its digest; matching means success, different means incident. Do not use an unconditional “insert marker then always update users” batch. Unrated/no-contest settlement records the result but creates no rating events or ranked counter increments. Unit and deployed D1 tests must verify trigger behavior, rollback and concurrent duplicate insertion.

Elo: `EA=1/(1+10^((RB-RA)/400))`; `deltaA=round(32*(scoreA-EA))`; `deltaB=-deltaA`, with score 1/0/0.5 for win/loss/draw. Define rounding as floor(x+0.5), including negative values, to avoid language differences. Compute against saved pre-match ratings; block new ranked pairing until settlement completes. A draw increments both draw counters. No-contest changes neither rating nor ranked games. Store formula version; never silently rewrite past events after a formula change.

## Tests and acceptance

- [ ] Duplicate concurrent settlement produces one marker and two ranked events, with one counter update per player.
- [ ] Crash before/after D1 commit converges to the same result; conflicting digest raises an alert.
- [ ] FK violations, invalid state/enum values and oversized inputs fail safely.
- [ ] Public API snapshots contain no hidden-case fields, expected hidden output or reference source.
- [ ] Migration succeeds on empty and previous schema; restore drill verifies ledger/counter consistency.
- [ ] Retiring/updating a problem cannot change an in-progress match's pinned version.
- [ ] User history, leaderboard and exposure queries have bounded pagination.
