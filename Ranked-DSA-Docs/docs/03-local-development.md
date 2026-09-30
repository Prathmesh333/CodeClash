# 03 — Local development

## Repository contract

```text
ranked-dsa/
  apps/web/                   React/Vite app
  apps/worker/                API, MatchmakerDO, MatchDO, wrangler.jsonc
  apps/judge-worker/          private judge adapter and coordinator
  packages/protocol/         validated client/server message schemas
  packages/problem-schema/   public and private problem contracts
  packages/shared/           rating and rule logic
  judge/                     Dockerfile, runner and adversarial fixtures
  database/migrations/       reviewed forward migrations
  database/seed/             local fixtures only
  tests/unit/ integration/ e2e/ multiplayer/ load/
  scripts/                   orchestration, seeding and evidence export
  docs/                      this pack, decisions and operating runbooks
```

## Prerequisites

- [ ] Git, supported Node LTS, pinned pnpm, pinned Wrangler, Docker-compatible Linux container engine.
- [ ] On Windows, working Docker Desktop/WSL2 or equivalent supported Docker setup; verify with `docker version`.
- [ ] Sandbox SDK package and container image versions are compatible and pinned, including image digest in release metadata.
- [ ] `.env.example` and `.dev.vars.example` contain names and nonsecret examples only; real files are ignored.
- [ ] Use local D1/DO bindings by default. Disable remote bindings in the normal development profile.

Cloudflare supports local Worker/container development through Wrangler with Docker running. Local simulation still needs deployed validation for regional latency, quotas, billing and production isolation. See [local container development](https://developers.cloudflare.com/containers/guides/local-dev/).

## Environment names

`APP_ENV=local|staging|production`, `APP_ORIGIN`, `AUTH_ISSUER`, `AUTH_CLIENT_ID`, `AUTH_CLIENT_SECRET`, `SESSION_SECRET`, and environment-specific database/DO/service bindings. Any `VITE_*` value is public: never put secrets there. Default to server-side session cookies, Secure in hosted environments, HttpOnly and SameSite=Lax; validate Origin/CSRF on mutations and WSS upgrades. Auth implementation must check issuer, audience, signature and expiry. Local-only demo identity is bound to local environment and cannot be enabled by a request header.

## First-run commands

Run from repository root after the implementation agent has created the scripts. Scripts fail if required local config is absent.

```sh
node --version
pnpm --version
docker version
pnpm install --frozen-lockfile
pnpm db:migrate:local
pnpm db:seed:local
pnpm dev
```

`pnpm dev` must orchestrate web, API and private judge locally and print their URLs. Proposed web URL: `http://localhost:5173`; API: `http://localhost:8787`; proxy `/api` including WebSockets through Vite so cookie/origin behavior is consistent. Do not hardcode development ports into production bundles.

Underlying API command, run from `apps/worker`:

```sh
pnpm exec wrangler dev
pnpm exec wrangler d1 migrations apply DB --local
pnpm exec wrangler d1 execute DB --local --file=../../database/seed/local.sql
```

Configure `migrations_dir` relative to the Worker configuration. `DB` is the chosen D1 binding. Start the judge Worker through its own current generated Sandbox configuration and service-binding development setup. Document exact multi-worker invocation after pinning Wrangler; do not silently replace real execution with a stub.

## Seed contract

Create two deterministic local demo identities at rating 1200, at least six original tiny fixture problems, and solutions covering accepted, wrong answer, runtime error, TLE, memory limit and output limit. Provide a separate bank for repeated simulation so unseen-problem selection is testable. Seeds must be idempotent and refuse production environment. No demo passwords or auth bypass endpoints in a production build.

## Two-browser gate

1. Open browser A and a separate browser profile/private session B; login as different demo users.
2. Join queue on A and B; verify one shared match ID and two distinct memberships.
3. Acknowledge ready; capture countdown/start timestamps and problem version on both clients.
4. A runs public samples and submits a known wrong solution. Verify match remains active.
5. B submits accepted solution; confirm identical final result and exactly two rating ledger events for a ranked match.
6. Reload A, inspect history and leaderboard; verify persisted result and rating.
7. Request/accept rematch; confirm new problem and unrated label.
8. Repeat while disconnecting A, restarting Worker, sending duplicate requests and delaying earlier judge results.

## Troubleshooting

Docker unavailable: show setup error and skip judge tests as BLOCKED. Migrations missing: report missing schema version. Cookie rejected: check proxy origin and local Secure-cookie handling. WebSocket 403: check session and Origin, not permissive wildcard rules. Port busy: print process/port guidance and allow configured overrides. Stale local DB: offer an explicitly local reset script that prints the target before deletion; never auto-reset remote data.

Acceptance: a fresh checkout can complete the walkthrough using this document; no unexplained manual edits, remote credentials or unrecorded setup steps are required for the local gate.
