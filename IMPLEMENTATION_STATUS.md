# Implementation status

**2026-09-30 update:** Cloudflare staging is deployed at https://ranked-dsa-staging.shortlistd.workers.dev with a separate migrated D1 database and 20 seeded questions. GitHub credentials and real login verification remain pending. Ranked judging stays disabled. See [STAGING.md](STAGING.md). Older local-stage records below are historical.

Owner: implementation agent · Last updated: 2026-09-29 · Scope: Phases 0–4 of `Ranked-DSA-Docs/docs/15-phased-roadmap.md`

This file records what exists in the repository, what was verified, and what remains. It follows the
working instruction in `Ranked-DSA-Docs/START_HERE.md` and the status table required by document 15.
Nothing here is a release claim: no staging deployment, no real server judge execution and no capacity run
has been performed. `RELEASE_EVIDENCE.md` holds the honest gate table.

## Phase status

| Phase | Work | Status | Evidence |
|---|---|---|---|
| 0 — Feasibility | judge isolation spike, image, toolchain pinned | BLOCKED | `pnpm test:judge`, `pnpm test:security` need Docker; see limitations |
| 1 — Foundation | monorepo, Worker routes/assets, auth, D1 migrations and seeds | PASS | `pnpm typecheck`, `pnpm test:integration`, `pnpm test:e2e` |
| 2 — Judge | versioned problems, public/private split, verdicts, limits, durable jobs | PARTIAL | problem format and Worker adapter exist; real Sandbox execution NOT RUN |
| 3 — Match core | queue, room lifecycle, ready/countdown/reveal, WebSockets, reconnect | PASS | `pnpm test:integration`, `pnpm test:e2e` |
| 4 — Competitive result | receipt ordering, deadlines/forfeit/no contest, D1 settlement, Elo, history, leaderboard, rematch | PARTIAL | adjudication, settlement and rematch are covered; race/recovery permutations are NOT RUN |
| 5 — Staging | separate resources, secrets, real image, observability, rollback | NOT STARTED | needs a Cloudflare account and approved spend |
| 6 — Capacity | bot harness, 10/50/100 progression, three seeded runs, soak | NOT STARTED | harness exists (`pnpm simulate`) but requires a real judge |
| 7 — Fairness | reviewed problem bank, region tests, playtest, accessibility | NOT STARTED | needs human participants |
| 8 — Closed alpha | controlled promotion, measured cap, handoff | NOT STARTED | blocked by 5–7 |

## Browser execution update

Run now executes public examples using Pyodide 314.0.7 on the player’s device. It uses a disposable worker in an opaque-origin iframe, a five-second execution timeout, a 16 KiB output limit, and cancellation. Local results never update ratings or decide a match. Ranked Submit still requires the isolated server judge. See [BROWSER_PYTHON.md](BROWSER_PYTHON.md).

## Ranked question bank update

Expanded to 20 questions (11 Easy, 9 Medium), with 499 cases verified against private Python references. Random unseen selection prefers difficulty based on the pair’s average rating. The local database is seeded; public JSON excludes reference solutions, editorials and hidden tests. See [RANKED_QUESTIONS.md](RANKED_QUESTIONS.md). Server judge, human difficulty review and capacity gates remain open.

## What exists

- `apps/web` — React 19 + Vite + TypeScript single-page client: local and GitHub sign-in, queue,
  ready/countdown, Monaco Python editor, public run, submit, results, rating, history, leaderboard,
  rematch, server-derived clock, reconnect with backoff.
- `apps/worker` — Cloudflare Worker: session auth, origin enforcement, leaderboard, history, a
  matchmaking Durable Object and one Durable Object per match with WebSocket hibernation, alarm-driven
  adjudication, D1 settlement with trigger-enforced idempotency.
- `apps/judge-worker` — private judge Worker; no public route; reached only by service binding and
  only when `ISOLATION_VERIFIED=true`; destroys the sandbox after every job.
- `judge/` — judge image (`bubblewrap` + `python3`), `runner.py` (namespace execution, bounded
  stdout/stderr, wall deadline) and `limits.py` (CPU/AS/FSIZE/NPROC/NOFILE/CORE limits).
- `database/` — migration `0001_initial.sql` (users, sessions, oauth states, problems, exposure,
  matches, settlements, rating events, settlement trigger) and `0002_submissions.sql` (durable
  submission audit trail with unique request keys and receipt ordering); `problems.mjs` holds 20
  original ranked problems with 499 public/hidden cases, private reference solutions and editorials.
- `packages/shared` and `packages/protocol` — the rules engine (Elo, pairing windows, `resolve`,
  `advance`) and the validated wire schemas shared by client and server.
- `scripts/` — `dev`, `test-server`, `seed`, `judge-check`, `simulate`, `staging-check`, `evidence`.
- `tests/` — unit (rules), integration (real Worker + DO + D1), browser (two contexts, full flow).

## Verified in this environment

| Check | Command | Result |
|---|---|---|
| Types | `pnpm typecheck` | pass |
| Unit rules and recovery | `pnpm test:unit` | 35 pass (rules, mocked room recovery, evidence validation and API retry behavior) |
| Trusted Python supervision | `python -m unittest discover -s tests/unit -p "*_test.py"` | 7 pass; no contestant code executed |
| Integration | `pnpm test:integration` | 17 pass (real Worker, DO, D1) |
| Browser | `pnpm test:e2e` | 3 pass (two independent contexts) |
| Build | `pnpm build` | pass |
| Judge fixtures | `pnpm test:judge` | NOT RUN — Docker not available here |
| Security fixtures | `pnpm test:security` | NOT RUN — Docker not available here |
| Staging | `pnpm test:staging` | BLOCKED — no `STAGING_URL` |
| Capacity | `pnpm simulate` | BLOCKED — requires a real judge and 100 identities |

See [REVIEW_REPORT.md](REVIEW_REPORT.md) for the subsequent review, durability repairs and remaining release blockers.

## Defects found and fixed during this phase

1. **Durable Object API errors escaped as opaque 500s.** workerd does not route a rejected
   `blockConcurrencyWhile` callback back to the awaiting request's `try/catch`, so every
   `ApiError` raised in a room became a 500 with an unhandled rejection instead of its documented
   status. Both Durable Objects now catch inside the callback
   (`apps/worker/src/match.ts`, `apps/worker/src/matchmaker.ts`).
2. **Worker route errors escaped as HTML 500 pages.** `return promise` inside a `try` block is not
   covered by its `catch`, so `/api/auth/local` and `/api/auth/github` failures never produced their
   documented JSON errors. All returned promises in `apps/worker/src/index.ts` are now awaited.
3. **Uncaught WebSocket sends.** Sending to a replaced or closing socket threw inside hibernation
   event handlers. Sends are now guarded and every handler catches
   (`apps/worker/src/match.ts`).
4. **Run button had no accessible name.** The decorative glyph was part of the button's accessible
   name (`"▷ Run"`), which broke assistive technology and the documented test contract. It is now
   `aria-hidden`.
5. **No durable submission record.** Submissions existed only in Durable Object storage, so there was
   no audit trail and no database-level protection against a replayed request key. Migration
   `0002_submissions.sql` holds the audit trail. The subsequent review made this a retryable projection of the room’s durable receipt and verdict.
6. **Browser suite depended on the Vite dev proxy.** The proxy dropped connections under the
   browser's load, which is what made the flow appear broken. The suite now runs against one origin:
   a real local Worker serving the built frontend as Worker static assets.
7. **Redundant traffic.** The client fetched a match snapshot and opened a socket for the same state,
   and polled the queue while a match was running. Both are removed; the socket is authoritative and
   the HTTP snapshot is now a fallback.

## Known limitations and risks

- **No real judge execution has been proven.** `apps/judge-worker` and `judge/` are written against
  the pinned `@cloudflare/sandbox` 0.12.10 line, but the container has not run here, so isolation,
  limits and verdicts are unverified. Public execution stays blocked until `pnpm test:judge` and
  `pnpm test:security` pass. A `judge` job now runs both in CI on a Docker host and blocks promotion;
  its first result on CI hardware is the real evidence, and it may fail there because bubblewrap needs
  unprivileged user namespaces inside the container.
- **Local workerd on this machine is slow and lossy.** Measured request times were 1–9 seconds and
  the first attempt on a connection was occasionally dropped (miniflare's ProxyWorker recovered on
  attempt 2). Clients and test harnesses therefore retry transport failures once, and timeouts are
  generous. This is a development-environment characteristic, not a production claim; it should be
  re-measured on CI hardware before drawing any latency conclusion.
- **Judge-dependent race permutations are untested.** Reversed verdict order, duplicate delivery
  under load, timeout and disconnection tests are covered by the pure rules in `tests/unit`, but not
  end to end through a real judge. Document 8 requires a judge adapter for those; adding one is the
  next piece of work (see Remaining).
- **Auth provider choice is undecided.** Local demo sign-in and GitHub OAuth are implemented;
  credentials and the production provider are external inputs.
- **Problem bank is unreviewed.** Six original problems exist with accepted solutions in the seed
  fixtures; no independent review or difficulty calibration (document 11) has happened.
- **Observability, alerting and spend controls** exist only as `observability.enabled` in the config.

## Remaining work, in order

1. Prove judge isolation and limits on a machine with Docker (`pnpm test:judge`, `pnpm test:security`),
   then run the real Sandbox path once against `apps/judge-worker`.
2. Add an injectable judge adapter, labelled `judge=mock`, and use it for the race, duplicate
   delivery, reversed verdict, timeout and disconnection suites. Mock runs may not satisfy the judge,
   end-to-end or capacity gates.
3. Property-based interleavings of joins, leaves, callbacks, reconnects, alarms and retries, asserting
   legal terminal states, one active match per account, two distinct players, immutable results and
   no duplicate rating effects. Save failing seeds.
4. Deployment and staging: separate resources, secrets, real image, `pnpm test:staging`, rollback and
   restore drill.
5. Capacity: 10/50/100 progression, three seeded 100-player runs with a real judge, then the soak.
6. Fairness: reviewed problem bank, region/reveal checks, human playtest, accessibility pass at
   360/768/1280 px, keyboard-only run.
7. Decide the authentication provider and record the decision.

## External inputs still required

Cloudflare account with Sandbox/Container quota, authentication provider credentials, staging and
production domains, deployment credentials, approved test spend, and human playtest participants.
