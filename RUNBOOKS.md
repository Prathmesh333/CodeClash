# Runbooks

Operational procedures for this repository. Every command is the real one used by the tooling; no step
assumes a service that is not configured. Where a step cannot be completed in the current
environment, it says so instead of describing an idealized procedure.

## 1. Start locally (two players on one machine)

```sh
pnpm install
pnpm db:migrate:local
pnpm db:seed:local
pnpm dev
```

- Web: <http://127.0.0.1:5173>, API: <http://127.0.0.1:8787> (the Vite dev server proxies `/api`
  and the WebSocket upgrade to the Worker).
- Sign in as two **different** demo accounts — `AdaByte` (alice) and `LoopRunner` (bob). Use a normal
  window and a private/incognito window, or two browser profiles: two tabs in one profile share the
  session cookie and will not produce two players.
- Full queue → countdown → editor → run → submit → result → rating → history → rematch works locally
  **except** code execution, which is refused with `503 JUDGE_UNAVAILABLE` until the isolated judge is
  configured. That refusal is deliberate: an unconfigured judge must never look like a verdict.
- Rate range, 20 minute duration, three second countdown, 30 second disconnect grace and 60 second
  adjudication bound are all server-authoritative.

## 2. Local gate (the definition-of-done suite)

```sh
pnpm typecheck
pnpm test:unit
pnpm test:integration
pnpm build
pnpm test:e2e
pnpm test:judge      # requires Docker
pnpm test:security   # requires Docker
```

- `test:integration` boots a real local Worker with its own throwaway D1 and Durable Object state in
  `work/integration-state-*`, applies migrations, seeds 4 demo and 32 test accounts, and asserts against
  the read-only evidence endpoint. Worker output is mirrored to `work/integration-worker-<port>.log`.
- `test:e2e` builds the frontend, migrates, seeds and serves everything from one local origin on
  port 8790 (`E2E_PORT` overrides). Worker output is mirrored to `work/e2e-worker.log`.
- If Docker is missing, `test:judge` and `test:security` exit with code 2 and print `BLOCKED`. That is
  a blocked gate, never a pass.
- The local workerd on some machines answers slowly (1–9 s per request measured) and drops the first
  attempt on a connection. Clients retry a transport failure once; a retried flaky test is still a
  defect to investigate, and a dropped connection is not a product result.

## 3. Judge: prove isolation before any public execution

```sh
pnpm test:judge      # correctness fixtures in the real image
pnpm test:security   # filesystem, network, process, output and wall-deadline containment
```

What must hold before `ISOLATION_VERIFIED` may be set to `true` in `apps/judge-worker/wrangler.jsonc`
or its environment equivalent:

1. A submitted program cannot see `/opt/judge`, `/workspace/input.txt` or any hidden test file.
2. It cannot open a socket to the internet, to loopback, or to a link-local metadata address.
3. It cannot fork, cannot exceed 1 GiB memory, cannot exceed 2 s CPU, cannot write 8 KiB without an
   `OLE` verdict, and cannot outlive the 5 s wall deadline without a `TLE` verdict.
4. The namespace is required: if `bwrap` is unavailable the runner must fail closed as
   `JUDGE_ERROR`, never fall back to unsandboxed Python.
5. The sandbox is destroyed after every job; a lost sandbox must not be reused for another submission.

If any control fails, public judging stays disabled. `judge/runner.py` and `judge/limits.py` are the
only files that may run inside the container, and `runner.py` must never be executed on a host machine.

## 4. Deploy

Not performed in this environment. The intended sequence, with each step verified before the next:

1. Create separate staging resources: Worker, D1, Durable Object namespaces, R2 if needed, and an
   account or environment for the judge. Record every resource ID in private configuration.
2. Apply migrations to the remote database: `wrangler d1 migrations apply DB --remote --config
   apps/worker/wrangler.jsonc` (check the command against the pinned Wrangler 4.141.0 first).
3. Deploy the API Worker and then the judge Worker. The judge has no public route and must be reached
   only by service binding.
4. Set secrets: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`. Set vars: `APP_ENV=staging`,
   `APP_ORIGIN=https://<staging-host>`, `JUDGE_ENABLED=true`. Do **not** set `TEST_EVIDENCE`.
5. Smoke: `STAGING_URL=https://<staging-host> pnpm test:staging`, then two real players through the
   full flow, then a recovery drill.
6. Only after staging passes: capacity runs, then the production promotion in section 7.

## 5. Incident playbooks

**Judge unavailable (errors or timeouts climbing).** Set `JUDGE_ENABLED=false` and redeploy; new
queues are refused with `503` and existing rooms continue to the adjudication bound and then resolve
as no contest with no rating change. Do not delete rooms. Check the judge Worker logs and the
container inventory for leaked sandboxes. Never re-enable without the section 3 gate.

**D1 unavailable.** Matches continue in Durable Object storage; clients see "Rating settlement pending"
and the room retries settlement on its next alarm (within ~3 s). Do not hand-edit ratings. If D1 stays
down past the adjudication bound the match becomes a no contest, which is the intended safe outcome.
Alert on any settlement retry that persists beyond five minutes.

**Player reports a wrong verdict.** Collect the match id and the player's own submission verdict.
Hidden tests, expected outputs and the opponent's source are never returned to clients, so
investigation uses the `submissions` and `settlements` rows plus the judge's own logs, not a client
claim. A result that was already settled is immutable: correct it with a new settlement only through a
reviewed data change, never by editing history in place.

**A player cannot sign in.** Check `APP_ENV` and `APP_ORIGIN` first: local sign-in is refused unless
the environment is local and the request is from loopback. Then check the session row and the seven
day expiry. A forged or oversized cookie must resolve to no user and must never create an account.

**Suspected cross-origin or cross-match access.** Reproduce with the browser suite and the
`/api/test/state` invariants. A 403 `FORBIDDEN` from a room means a non-participant reached a live
match; a 403 `ORIGIN_DENIED` means the write was refused before routing. Both are correct outcomes;
any other status for those requests is a defect.

## 6. Backup, restore and rollback

- D1: export before every migration and before any production promotion; record the export location
  and the restore command in the release evidence. The restore drill has not been run yet, so RPO and
  RTO are unknown and must be measured before launch.
- Durable Objects: room state is durable per match, but a lost room is only reconstructible from
  `matches`, `settlements` and `rating_events`. Treat D1 exports as the source of truth for ratings.
- Rollback: keep the previous Worker build id and the previous judge image digest. A rules or schema
  change must be additive and forward-compatible, because Durable Object state written by the new
  version is not readable by the old one. Verify the rollback path in staging before launch.

## 7. Release decision

`pnpm evidence:verify --input <release-report.json>` exits non-zero unless every gate is `PASS` and
three real-judge 100-player runs are present with zero invariant violations. A missing measurement is
`NOT RUN`, an unavailable dependency is `BLOCKED`, and neither may be written up as a pass. The
release checklist in `Ranked-DSA-Docs/docs/14-release-checklist.md` governs promotion; the owner signs
the decision, not this file.
