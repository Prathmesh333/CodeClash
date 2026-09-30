# 10 — Load and multiplayer capacity testing

## What must be measured

Concurrent socket users, active matches, queued players and active judge containers are different quantities. Capacity evidence must include all four plus new connections/second, submissions/second, sandbox startup latency, CPU/memory usage, D1 rows read/written, error rates and actual test spend. A 100-socket idle test does not prove 100 players can submit simultaneously.

Use a stateful Node/TypeScript bot harness implementing the real protocol. Each bot has a unique identity/session and follows join → ready → reveal → public run → submit → result → settlement → requeue. A seed selects delays, solution fixtures, reconnects and fault scenarios. Validate results independently from server code; do not calculate expected outcomes by calling the same production result function.

## Mandatory 100-fake-player repeated simulation gate

Required on staging with the real judge, followed by local deterministic reproductions for any failure:

- **100 distinct fake accounts, 50 simultaneous matches per round.**
- **20 rounds per run**, completing 1,000 match attempts per run.
- **Three independent seeded runs**, totaling 3,000 match attempts and 6,000 player participations.
- All players finish/settle a round before normal ranked requeue. For no-contest/cancel scenarios count the terminal attempt and record no rating event.
- Ensure matchmaking test constraints do not stall the cohort: compatible test ratings, rotation to avoid recent opponents, and a sufficient fixture problem bank (at least 60 unseen problems per cohort for the 60 rounds). Do not disable normal eligibility rules to claim gate success.
- Use a fresh cohort per seed or account for exposure across seeds. Record this choice.
- Keep the full 50-room concurrency during active play; report observed peak and minimum during the active interval. Startup ramp and end-of-round drain are excluded from that interval.

## Reproducible CLI contract

Implement this CLI; it is not supplied in the documentation archive:

```sh
pnpm simulate -- --base-url https://<STAGING_DOMAIN> --players 100 --rounds 20 --seed 101 --judge real --scenario release-gate --output artifacts/gate-101
pnpm simulate -- --base-url https://<STAGING_DOMAIN> --players 100 --rounds 20 --seed 202 --judge real --scenario release-gate --output artifacts/gate-202
pnpm simulate -- --base-url https://<STAGING_DOMAIN> --players 100 --rounds 20 --seed 303 --judge real --scenario release-gate --output artifacts/gate-303
pnpm evidence:verify -- --input artifacts --gate 100-player-release
```

Bot credentials come from a private local file or secret store, never command-line arguments/logs. Pre-create staging identities through a restricted test provider/tool. Harness refuses production unless a separate intentional production-load policy is implemented. Enforce `<LOAD_TEST_BUDGET_USD>` and maximum run duration before dispatch.

## Scenario schedule (each 20-round run)

| Rounds | Workload |
|---|---|
| 1–5 | Normal runs, WA then AC, varying solve delays and equal-skill pairing |
| 6–8 | All 100 players submit within a one-second window; mix cold/warm infrastructure |
| 9–11 | Duplicate requests, stale frames, same-ms fixture races and reversed verdict delivery |
| 12–14 | 10% temporary disconnects, 5% beyond-grace disconnects, simultaneous disconnect fixture |
| 15–17 | Bounded sandbox startup failure, delayed job, callback loss and D1 settlement interruption |
| 18–20 | Recovery and clean normal play; no leftover jobs or memberships |

Fault injection is scoped to this staging run through authenticated internal controls; production builds cannot enable it. Use shortened match deadlines only in a separately labeled accelerated gate profile whose transitions and logic are identical. Additionally run a 60-minute soak with normal 20-minute rules and 100 concurrent players, including at least one full-deadline unsolved round. Do not treat an accelerated suite as timer-soak evidence.

## Required pass thresholds (alpha targets)

| Measure | Pass threshold |
|---|---|
| Invariants | zero wrong winners, duplicate pairings, duplicate settlements, hidden-data leaks or cross-user access |
| Completion | 100% attempts reach expected terminal state; expected injected no-contests labeled separately |
| Queue wait with compatible supplied peers | p95 ≤10 seconds |
| REST excluding asynchronous judge completion | p95 ≤300 ms, p99 ≤1 second |
| WebSocket state delivery, measured in test region | p95 ≤250 ms |
| Successful reconnect after connectivity restored within grace | ≥99%; p95 snapshot convergence ≤3 seconds |
| Judge queue wait for accepted jobs | p95 ≤5 seconds under normal load |
| Normal tiny accepted fixture receipt-to-verdict | p95 ≤10 seconds, p99 ≤30 seconds; report cold/warm separately |
| Unexpected server errors | <0.5% of valid requests, excluding specified injected failures; zero lost accepted jobs |
| Normal settlement lag | p95 ≤5 seconds, max ≤60 seconds |
| Recovery after injected fault removed | all retryable settlements/jobs converge within 120 seconds or documented no-contest deadline |
| Sandbox cleanup | zero orphan attempts 120 seconds after terminal run state |
| Cost | actual spend ≤configured test budget |

Collect per-seed metrics; do not hide a failing seed with aggregate percentiles. Record sample counts and raw distributions. Expected 429s under deliberate overload are distinct from normal-load failures; normal traffic must meet admission targets. Human gameplay fairness thresholds are in document 11.

## Capacity ladder and overload

Run 10 → 50 → 100 players first. Try 500 and 1,000 only after the prior stage passes and account/spend limits support it. At each stage run at least 15 minutes with the real mix of public runs and hidden submits. Increase arrival rate until a target fails, then record the bottleneck. Never infer capacity by multiplying a single-room result.

Estimate judge concurrency with `arrival rate × mean service duration`, then add measured burst headroom. During the 100-submission burst, either available judge capacity must meet the gate latency or the admission cap must be declared inadequate for the proposed release. Choose a published player cap below the measured sustainable level (default 70% of the highest passing normal-load level).

Overload checks: bounded queue, stable memory, fair per-user throttling, no unbounded retry storm, no dropped accepted job, explicit busy UI, and recovery when traffic falls. A failed 100-player gate blocks the planned alpha capacity claim; fix and rerun all three seeds.

## Evidence artifacts

Save run config, commit/tool/image versions, seeds, account/region identifiers, bot event traces, expected-vs-actual outcome CSV, API/WS latency histograms, D1 ledger reconciliation, sandbox cleanup inventory, cost measurement and summary JSON. Secrets/source/hidden tests are excluded. Mark every report NOT RUN until the actual application is tested.
