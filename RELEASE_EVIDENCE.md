# Release evidence

**2026-09-30 staging update:** The account-only staging Worker and its D1 database now exist; migrations and the 20-question bank were applied remotely. Real GitHub sign-in and ranked judging remain unverified. This does not satisfy the release gates below. See [STAGING.md](STAGING.md).

Status: **BLOCKED — not a release candidate.**

Filled from `Ranked-DSA-Docs/templates/RELEASE_EVIDENCE.md`. Only Phases 0–4 of the roadmap have been
implemented and verified, and only against a local development stack. No staging deployment, no real
judge execution and no capacity run has taken place, so every gate below the local line is `NOT RUN`
or `BLOCKED`. Nothing in this file may be read as a production claim.

## Build and environment

- Commit / release: not a tagged release; working tree reviewed on 2026-09-29
- Date / owner: 2026-09-29 / implementation agent
- Environment / region / domains: local only. Windows 11 development host, wrangler `dev`, no Cloudflare account
- Node / pnpm / Wrangler / SDK versions: Node 22.18.0, pnpm 11.25.0, wrangler 4.141.0, `@cloudflare/sandbox` 0.12.10, Vite 8.3.1, Vitest 5.0.2, Playwright 1.63.0, React 19.3.0
- Worker build IDs / image digest / compatibility date: not applicable locally; compatibility date `2026-09-01`, judge image built from `cloudflare/sandbox:0.12.10` (digest NOT RUN)
- Schema / protocol / rule / problem-suite versions: migrations `0001_initial.sql`, `0002_submissions.sql`; protocol version 1; rules in `packages/shared/game.ts`; problem suite `database/problems.mjs` v1, six original problems, unreviewed
- Account quotas / configured admission cap: unknown; no account. No admission cap is configured
- Budget / pricing date / actual spend: no spend; no budget approved

## Gate results

| Gate | Status | Command / fixture / seed | Evidence path | Failures or limitations |
|---|---|---|---|---|
| Fresh local setup | PASS | `pnpm db:migrate:local`, `pnpm db:seed:local`, `pnpm dev` | `IMPLEMENTATION_STATUS.md` | Verified by hand on the development host; two local players complete queue → countdown → result |
| Unit/integration/components | PASS | `pnpm typecheck`, `pnpm test:unit` (31), `pnpm test:integration` (17) | console output; `work/integration-worker-<port>.log` | Integration runs a real Worker, DO and D1; judge-dependent paths are not covered |
| Judge correctness/security | NOT RUN | `pnpm test:judge`, `pnpm test:security` | — | Docker is unavailable on this host. Isolation, limits and verdicts are unverified; public judging must stay disabled |
| Two-browser full flow | PASS | `pnpm test:e2e` (3 tests, two independent contexts, including rematch) | `playwright-report/`, `work/e2e-worker.log` | Run and submit deliberately end in `503 JUDGE_UNAVAILABLE`; the flow verifies the honest refusal, not execution |
| Protocol/rating recovery | PARTIAL | unit rules suite, integration settlement suites | test output | Receipt-order rules, duplicate settlement, stale-version abort and one-active-match are proven. Reversed verdict completion, duplicate delivery under load, forced timeout and disconnection permutations through a real judge are NOT RUN |
| Staging smoke/security | BLOCKED | `pnpm test:staging` | — | No staging deployment; `STAGING_URL` unset |
| 100 players, seed 101, 20 rounds | NOT RUN | `pnpm simulate` | — | Requires a real judge and 100 authenticated identities |
| 100 players, seed 202, 20 rounds | NOT RUN | `pnpm simulate` | — | as above |
| 100 players, seed 303, 20 rounds | NOT RUN | `pnpm simulate` | — | as above |
| 60-minute normal-clock soak | NOT RUN | `pnpm simulate` | — | as above |
| Fairness/human playtest | NOT RUN | — | — | Problem bank unreviewed; no playtest participants |
| Alerts/spend controls | NOT RUN | — | — | `observability.enabled` only; no alerts, budgets or rate limits configured |
| Rollback/restore | NOT RUN | — | — | No D1 export, no restore drill, no previous build to roll back to |

## Per-run capacity record

Not measured. No capacity run has been performed, so there are no completion counts, terminal attempts,
room peaks, judge peaks, timer profiles, durations, latency percentiles, cold-start distributions,
reconnect rates, settlement lags, invariant counts, fault-injection results, ledger reconciliation or
sandbox inventory. The harness that would produce them (`scripts/simulate.mjs`) deliberately labels its
own output "Baseline only" and refuses to run against a production environment or a mock judge.

One local latency observation is recorded because it affected test design, not because it is a capacity
result: the local workerd answered requests in 1–9 s and occasionally dropped the first attempt on a
connection, which miniflare recovered internally. This is a development-host characteristic. No
threshold in document 10 has been evaluated.

## Recovery and release decision

- Backup checkpoint / restore drill RPO and RTO: not started; no export taken
- Known compatible rollback builds/image: none; this is the first build
- Open defects with severity/owner: see `IMPLEMENTATION_STATUS.md`. The two blocking ones are the
  unproven judge isolation and the untested judge-dependent race suites
- Measured safe operating cap and margin: unknown; no measurement exists
- Release checklist complete: no
- Decision (GO / NO-GO / BLOCKED): **NO-GO / BLOCKED** — Phases 5–8 are not started
- Responsible owner and time: implementation agent, 2026-09-27
- Follow-up actions: prove judge isolation with Docker, add the judge adapter and race suites, then
  deploy staging, run capacity, then fairness, then promotion

## What a pass would require

1. `pnpm test:judge` and `pnpm test:security` green on a Docker host, with the image digest recorded.
2. One real Sandbox execution end to end through `apps/judge-worker`, with hidden data confirmed
   unreachable from submitted code.
3. A staging deployment on separate resources with secrets, `JUDGE_ENABLED=true` and no
   `TEST_EVIDENCE`, passing `pnpm test:staging` plus the two-player hosted flow.
4. Three seeded 100-player runs with `judge=real`, zero invariant violations and the document 10
   latency thresholds measured and met.
5. A D1 restore drill with recorded RPO and RTO, a tested rollback, alerts and spending controls.
6. A reviewed problem bank, a human playtest and the accessibility pass at 360/768/1280 px.
