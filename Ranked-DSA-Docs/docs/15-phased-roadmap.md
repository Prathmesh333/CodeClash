# 15 — Phased implementation roadmap

Work in ordered milestones; estimates depend on the repository and are intentionally not promises. Each phase closes with evidence and a runnable state. Prefer one complete local game over many unconnected UI pages.

| Phase | Work | Deliverable and exit gate |
|---|---|---|
| 0 — Feasibility | inspect repo, pin toolchain, choose auth, generate Sandbox config, prove OS/network/control-service isolation and cleanup, confirm account availability | decision records, reproducible judge spike and security proof; public judge blocked if controls fail |
| 1 — Foundation | monorepo, React/Vite, Worker routes/assets, auth, shared validated schemas, D1 migrations/seeds | fresh local start, real session, profile and database integration tests |
| 2 — Judge | versioned problem format, public/private serializers, real Python execution, verdicts, limits, durable jobs and cleanup | known-good/bad/adversarial fixture suite passes; no hidden-data exposure |
| 3 — Match core | single-region queue, reservations, room lifecycle, ready/countdown/reveal, WebSockets and reconnect | two browsers receive same version, recover from reload and complete real submissions |
| 4 — Competitive result | receipt ordering, deadlines/forfeit/no contest, D1 settlement, Elo, history, leaderboard and unrated rematch | all race/idempotency/recovery tests pass; full local gate complete |
| 5 — Staging | separate resources, secrets, real image deploy, observability, CI, rollback/restore and spend limits | hosted component suite and two-player smoke pass |
| 6 — Capacity | bot harness, deterministic traces, 10/50/100 progression, three seeded 100-player runs and normal-clock soak | document 10 gate passes with cost/capacity evidence |
| 7 — Fairness | reviewed problem bank, region/reveal tests, human playtest, UI accessibility and outcome clarity | document 11 gate passes; release evidence complete |
| 8 — Closed alpha | controlled production promotion, measured cap, operational handoff | release checklist satisfied, smoke passes, 24-hour review scheduled by owner |

## Work tracking

Each implementation issue should name: document/acceptance criterion, intended behavior, failure case, test evidence and dependency. Keep a status table with NOT STARTED / IN PROGRESS / PASS / BLOCKED. A UI mock, mock judge or passing build is not completion of multiplayer correctness.

## Dependency rules

- Judge boundary proof precedes public execution.
- Protocol and problem version contracts precede parallel frontend/backend integration.
- Durable job/retry design precedes asynchronous judging claims.
- Rating settlement proof precedes rated matches.
- Staging correctness precedes load testing; load and fairness gates precede production claims.
- Credentials, billing/domain setup and human playtest participants are external dependencies; finish independent local work while waiting.

## Later roadmap, after evidence

C++ then Java may be considered with separate images/resource calibration and security regressions. R2 can hold large private assets/replays when needed. Region sharding requires globally unique account membership and new fairness/capacity tests. Tournaments, AI coaching, social features and optimization scoring require their own product rules. None should delay the Python 1v1 correctness gate.
