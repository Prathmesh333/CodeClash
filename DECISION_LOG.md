# Decision log

Copy of `Ranked-DSA-Docs/templates/DECISION_LOG.md`. Product defaults remain those in the numbered
documents unless an entry below changes them. Every entry records what was actually verified.

## ADR-001: Python-only MVP on Cloudflare Workers, Durable Objects and D1

- Date / owner: 2026-09-27 / implementation agent
- Status: accepted
- Requirement or problem: The product must be a real-time 1v1 game with authoritative receipts, no
  client-trusted results, and a durable rating history, without owning servers.
- Chosen behavior: React + Vite + TypeScript frontend, Cloudflare Worker API, one matchmaking Durable
  Object and one Durable Object per match with WebSocket hibernation, D1 for accounts, immutable
  problem versions, submissions, matches and rating history, Cloudflare Sandbox for Python execution.
- Reason and supporting evidence: Durable Object storage gives a single authoritative room per match,
  so receipt order, deadlines and settlement cannot be raced by a client. Hibernation keeps idle rooms
  cheap. `pnpm test:integration` demonstrates a single settlement and single rating event per match
  against real D1 with the production triggers.
- Alternatives considered: a relational server with websockets (rejected: no per-room authoritative
  actor); a single Worker without rooms (rejected: no per-match isolation or alarm scheduling).
- Risks or limitations: local workerd is slow and occasionally drops connections; mitigated by
  transport retries and measured, not assumed, behavior.
- Affected documents, rules and versions: 02, 06, 08; schema `0001_initial.sql`, `0002_submissions.sql`.
- Acceptance tests and results: `pnpm test:unit`, `pnpm test:integration`, `pnpm test:e2e` pass.
- Revisit condition: if Sandbox quotas are unavailable, revisit the execution boundary before launch.

## ADR-002: Judge runs only in the isolated container, reached by a private service binding

- Date / owner: 2026-09-27 / implementation agent
- Status: accepted
- Requirement or problem: Contestant code must never run in the API Worker, and hidden tests,
  credentials and other contestants' data must be unreachable from submitted programs.
- Chosen behavior: `apps/judge-worker` has no public route, refuses every request unless
  `ISOLATION_VERIFIED=true`, executes `judge/runner.py` inside bubblewrap user/net/PID namespaces with
  `rlimits` from `judge/limits.py`, and destroys the sandbox after each job. The API Worker holds a
  `JUDGE` service binding and sets `JUDGE_ENABLED=false` locally, so unconfigured local development
  answers `503 JUDGE_UNAVAILABLE` instead of pretending to judge.
- Reason and supporting evidence: the isolation controls are implemented and reviewed; the
  `judge-check.mjs` fixtures assert filesystem, network, process, output and wall-deadline containment
  from inside the image only. Contests run with `--network none` in the fixture path.
- Alternatives considered: executing Python in the Worker (rejected, prohibited); a self-hosted
  judge host (rejected, no isolation proof available).
- Risks or limitations: **isolation is unproven in this environment** — Docker was unavailable, so
  `pnpm test:judge` and `pnpm test:security` are NOT RUN and public execution stays blocked.
- Affected documents, rules and versions: 05, 07; `judge/Dockerfile`, `judge/runner.py`,
  `judge/limits.py`, `apps/judge-worker/src/index.ts`.
- Acceptance tests and results: NOT RUN (Docker unavailable). Blocking condition for any public judging.
- Revisit condition: immediately after the first successful isolated fixture run.

## ADR-003: Local sign-in for development, GitHub OAuth implemented but not selected

- Date / owner: 2026-09-27 / implementation agent
- Status: proposed
- Requirement or problem: Document 1 requires a configured identity provider and a session validated
  server-side; a fresh checkout must be playable with no external credentials.
- Chosen behavior: two paths. `POST /api/auth/local` is available only when the Worker is in the local
  environment, the request is from loopback, the id matches `^[\w-]{1,40}$` and the account exists in
  D1. GitHub OAuth is implemented (`/api/auth/github`) and returns `503 AUTH_UNAVAILABLE` until
  credentials are configured. Sessions are opaque random tokens stored as SHA-256 hashes with a
  seven-day expiry.
- Reason and supporting evidence: `pnpm test:integration` proves a local sign-in, a forged cookie
  resolving to no user without provisioning an account, and sign-out invalidating the cookie. The
  local allow-list is the database, not a hardcoded name list, so test identities are possible without
  weakening the boundary.
- Alternatives considered: a third-party identity provider (not evaluated, needs a decision);
  password accounts (rejected, out of scope).
- Risks or limitations: the production provider is undecided; `GITHUB_CLIENT_ID/SECRET` are unset, so
  no production sign-in path is proven. Test-only authentication must be impossible in production:
  it is gated on `APP_ENV=local` and loopback, but this must be re-checked against the deployed
  environment before promotion.
- Affected documents, rules and versions: 01, 03; `apps/worker/src/auth.ts`, `apps/worker/.dev.vars.example`.
- Acceptance tests and results: `pnpm test:integration` session and route boundary suite passes.
- Revisit condition: when credentials and the account are available.

## ADR-004: Rating settlement is one D1 batch guarded by a unique marker and a trigger

- Date / owner: 2026-09-27 / implementation agent
- Status: accepted
- Requirement or problem: Replay, concurrency or a lost acknowledgment must never apply a rating
  change twice, and a stale rating must abort the whole settlement.
- Chosen behavior: `settlements` has `match_id` as primary key and is inserted with
  `ON CONFLICT DO NOTHING`; an `AFTER INSERT` trigger validates participants, the stored rating
  versions and the digest, then writes exactly two `rating_events` rows and updates both users. The
  Worker re-reads the stored digest and treats a mismatch as an incident.
- Reason and supporting evidence: `tests/integration/settlement.test.ts` proves a duplicate insert
  cannot double-apply, and that a stale rating version aborts the whole statement group with zero rows
  written. The real-Worker suite proves exactly one settlement and two rating events for a forfeit,
  zero net rating change, and `rating_before + delta = rating_after` for every stored event.
- Alternatives considered: conditional UPDATEs without a marker (rejected: a zero-row update is not a
  failure and replay would silently re-run); application-side locking (rejected, no cross-isolate lock).
- Risks or limitations: unrated and cancelled matches still record a `rated=0` settlement; that is an
  audit row, not a rating event, and is asserted explicitly.
- Affected documents, rules and versions: 04, 11; `database/migrations/0001_initial.sql`,
  `apps/worker/src/match.ts`.
- Acceptance tests and results: both settlement suites pass.
- Revisit condition: if the rating formula changes, add a version rather than rewriting history.

## ADR-005: Errors must be caught inside the Durable Object callback and every route promise awaited

- Date / owner: 2026-09-27 / implementation agent
- Status: accepted
- Requirement or problem: Every documented API error must reach the client as its own status and code.
  Both Durable Objects and the Worker were returning opaque 500 HTML pages for conditions such as a
  missing idempotency key, a closed match, a missing judge and an unusable sign-in payload.
- Chosen behavior: `blockConcurrencyWhile` callbacks catch their own errors (workerd does not route a
  rejected callback to the awaiting request's `catch`), and every promise returned from inside a
  `try` block in `apps/worker/src/index.ts` is awaited, because `return promise` is outside the
  `catch`. Non-`ApiError` failures log a structured event and return `500 INTERNAL` with a request id.
- Reason and supporting evidence: reproduced with a real local Worker before and after the change;
  `POST /api/auth/local` with an unusable payload now returns `400 INVALID_USER` instead of a 500 HTML
  page, and the judge-disabled run returns `503 JUDGE_UNAVAILABLE`. Both are asserted in the integration
  and browser suites.
- Alternatives considered: relying on a framework to translate errors (rejected: it cannot see errors
  swallowed by a rejected concurrency-gate callback); swallowing errors and returning 200 (rejected,
  dishonest).
- Risks or limitations: any future handler added inside a concurrency gate must repeat this pattern;
  a lint rule is not yet in place.
- Affected documents, rules and versions: 07, 08; `apps/worker/src/index.ts`,
  `apps/worker/src/match.ts`, `apps/worker/src/matchmaker.ts`.
- Acceptance tests and results: `pnpm test:integration` (status-code and boundary suite) and
  `pnpm test:e2e` pass.
- Revisit condition: if the runtime is upgraded and the callbacks propagate rejections again.

## ADR-006: The browser suite runs against one origin, not a Vite dev proxy

- Date / owner: 2026-09-27 / implementation agent
- Status: accepted
- Requirement or problem: Two independent browser contexts must complete the full flow reliably. With
  the Vite dev server in front, connections to the Worker were dropped mid-match, so the countdown
  never appeared to finish and the run request never produced an error, which looked like product bugs.
- Chosen behavior: `scripts/test-server.mjs` builds the frontend, applies migrations, seeds a private
  D1, and starts `wrangler dev` with `apps/worker/wrangler.e2e.jsonc`, which adds an `ASSETS` binding
  over `dist/web`. Playwright targets that single origin. `pnpm dev` is unchanged for human
  development, where HMR is wanted. The test server refuses to start if the e2e config drifts from
  `wrangler.jsonc`.
- Reason and supporting evidence: the full flow then passes, including the same problem version on
  both clients, reconnect after reload, the honest 503, the forfeit, and the persisted `Defeat` in
  history. The application topology now matches the documented production shape.
- Alternatives considered: keep the proxy and raise timeouts (rejected: the drops were the cause, not
  the timing); stub the socket in tests (rejected, would not test the real protocol).
- Risks or limitations: the e2e config duplicates bindings from `wrangler.jsonc`; the drift check in
  `scripts/test-server.mjs` guards it and the integration config is checked the same way.
- Affected documents, rules and versions: 03, 08; `playwright.config.ts`, `scripts/test-server.mjs`,
  `apps/worker/wrangler.e2e.jsonc`.
- Acceptance tests and results: `pnpm test:e2e` 3 pass, twice in a row after the change.
- Revisit condition: if Vite's proxy becomes reliable again, the change can be reverted deliberately.

## ADR-007: Read-only test evidence endpoint, local and opt-in only

- Date / owner: 2026-09-27 / implementation agent
- Status: accepted
- Requirement or problem: Document 8 forbids mutating D1 to force outcomes and asks for read-only test
  evidence endpoints limited to local and staging. Shelling out to `wrangler d1 execute` against a
  live worker's database produced `SQLITE_ERROR` and contention.
- Chosen behavior: `GET /api/test/state` returns invariant counters plus projection rows. It requires
  `APP_ENV=local`, `TEST_EVIDENCE=true` and a loopback request; every other `/api/test/*` path is a
  404. The `TEST_EVIDENCE` flag is set only in `wrangler.integration.jsonc` and
  `wrangler.e2e.jsonc`, never in the base config.
- Reason and supporting evidence: the integration suite asserts ten invariants (no duplicate
  settlements, no orphan rating events, no self matches, no duplicate request keys or receipt order,
  no submissions in an unknown match) through the endpoint. It never returns source code, session
  tokens or secrets.
- Alternatives considered: direct D1 access from tests (rejected: contention and a second writer);
  assertions on UI text only (rejected: cannot prove what was persisted).
- Risks or limitations: staging needs an equivalent, separately reviewed endpoint before hosted suites
  can run; the current one is local-only by design.
- Affected documents, rules and versions: 08; `apps/worker/src/evidence.ts`, `apps/worker/src/index.ts`.
- Acceptance tests and results: `pnpm test:integration` 17 pass.
- Revisit condition: when staging exists, extend deliberately with a staging-only guard.

## ADR-008: Transport failures are retried once; authoritative answers never are

- Date / owner: 2026-09-27 / implementation agent
- Status: accepted
- Requirement or problem: Local workerd drops the first attempt on a connection often enough to
  surface as user-visible errors and test flakes. A dropped connection is not an API answer, and
  submissions already carry an `Idempotency-Key`, so a retry cannot duplicate work.
- Chosen behavior: the browser client sets a 10 s request timeout and retries once, and only when the
  request produced no response (network failure, timeout) — never on a status code. The integration
  harness does the same and treats a non-JSON body as a transport failure. Playwright's API client
  retries transport failures in the route-boundary test.
- Reason and supporting evidence: the browser flow and the integration suite pass repeatedly, and the
  retry never changes what an assertion sees. A 503 for a missing judge is still reported as a 503.
- Alternatives considered: no retry (rejected, flaky); retrying on any error (rejected, would mask real
  failures and could double-apply non-idempotent work); longer timeouts only (rejected, the request
  never returns).
- Risks or limitations: a genuine 5xx produced by a dropped upstream connection would be retried once
  in the harness; the sign-in helper only treats 5xx as transient. The measured drop rate is an
  environment property and must be re-measured on CI hardware.
- Affected documents, rules and versions: 08, 12; `apps/web/src/api.ts`, `tests/integration/harness.ts`,
  `tests/e2e/arena.spec.ts`.
- Acceptance tests and results: `pnpm test:e2e` and `pnpm test:integration` pass repeatedly.
- Revisit condition: when the runtime is deployed, re-measure and remove the retry if drops stop.

## ADR-009: Client clock, traffic and draft handling

- Date / owner: 2026-09-27 / implementation agent
- Status: accepted
- Requirement or problem: A client clock change must not extend play, the server must not be polled
  pointlessly, and an editor draft must not leak between accounts.
- Chosen behavior: the visible timer is `Date.now()` plus a server offset estimated from each snapshot
  and never from the client alone. The room socket is the single state channel; the HTTP snapshot is a
  fallback used only when no socket frame has arrived. Queue polling stops once a match exists.
  Drafts live in `localStorage` under `rdsa:<userId>:<matchId>` and are cleared on sign-out.
- Reason and supporting evidence: the browser test reloads mid-match and both clients still show the
  same server-derived countdown and the same problem version.
- Alternatives considered: trusting the client clock (rejected, prohibited); polling the room over HTTP
  (rejected, doubles Durable Object traffic for the same state).
- Risks or limitations: the offset is estimated from snapshot arrivals, so a long disconnection
  briefly shows a stale offset until the next frame.
- Affected documents, rules and versions: 01, 06; `apps/web/src/App.tsx`.
- Acceptance tests and results: `pnpm test:e2e` reconnect assertions pass.
- Revisit condition: if a clock-offset handshake is added, keep the server authoritative.
