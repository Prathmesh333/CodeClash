# 12 — Observability, metrics and cost

## Structured events

Every event includes UTC time, environment, build ID, rules/protocol version, request ID, match ID when applicable, submission/job ID when applicable, event name, duration and sanitized error code. Use pseudonymous account IDs. Source, auth tokens, cookies, secrets, hidden inputs/expected outputs and raw hidden stdout are prohibited in general logs.

Maintain an auditable final result record containing receipt ordering and validated verdict identities without logging hidden content. Correlation IDs belong in logs/traces, not unbounded metric labels. Metrics use bounded labels such as environment, endpoint class, verdict and instance class.

## Dashboard and alert contract

| Metric | Alert default | Immediate action |
|---|---|---|
| API unexpected 5xx | >1% for 5 min with ≥100 requests | inspect deployment and dependency health; pause new queue if sustained |
| Queue oldest wait | >120 seconds with compatible peers present | inspect stale memberships/pairing owner |
| Judge queue wait | p95 >5 seconds for 5 min | stop admission growth, inspect concurrency/cold starts |
| Judge infrastructure errors | >2% for 5 min, ≥50 jobs | disable new matches; recover or no-contest active games |
| Stale accepted jobs | any beyond hard deadline | reconcile attempt, terminate and resolve infrastructure outcome |
| Pending rating settlement | any >60 seconds | retry/reconcile ledger; block affected ranked requeue |
| Orphan sandboxes | any >120 seconds after terminal job | reap tracked IDs and investigate cleanup failures |
| Invariant/security violation | any occurrence | stop ranked queues, preserve evidence, investigate immediately |
| Daily projected spend | >80% of configured budget | reduce admission/concurrency; notify owner |
| Spending cap | configured maximum reached | refuse new work, drain accepted work safely |

Also chart concurrent sockets/rooms/queued accounts/judges, WebSocket reconnects, cold-start distribution, reveal skew, accepted/WA/TLE/RE rates by problem version, D1 rows read/written, execution CPU/memory and billing dimensions. Abrupt AC-rate changes may indicate a faulty problem or runtime change, not player behavior.

## Health and incident actions

Liveness says Worker handler is available. Readiness reflects bindings/schema plus recent judge health without launching a container per probe. Degraded judge health can leave profiles/history available while queue is closed. Public errors stay concise; internal errors carry correlation IDs.

Runbooks: (1) disable new queue admission; (2) identify impacted build/problem/jobs; (3) preserve sanitized traces; (4) finish valid games or no-contest within bounds; (5) recover dependency or roll back compatible code; (6) reconcile ratings and orphan jobs; (7) test a real two-player game before reopening. Never assign losses simply to clear a backlog.

## Cost model

Do not repeat the conversation's $5/month estimates as a service guarantee. Calculate from measured usage and current account pricing:

`total = Workers plan/usage + DO requests/duration/storage + D1 reads/writes/storage + container CPU + allocated memory-time + disk-time + applicable network/build/registry costs + auth/domain costs`.

For each simulation report jobs/match, startup and execution seconds/job, idle seconds, peak sandbox count, CPU usage and allocated memory/disk lifetime. Compare destroying each attempt versus any proposed reuse using real measured latency and cost. Do not keep two sandboxes alive for an entire 20-minute match without evidence that the latency benefit justifies cost and isolation complexity.

Check [Containers pricing](https://developers.cloudflare.com/containers/platform/pricing/) and linked product pricing before a budget decision. Store the date and applicable plan/allowances in the evidence report. Billing and usage units differ; billed allocated memory-time is not necessarily process peak memory.

## Operational acceptance

- [ ] One synthetic game can be traced from queue through settlement and cleanup.
- [ ] Each critical alert is triggered in staging and reaches the configured owner.
- [ ] Log access/retention is configured; secrets and hidden test data are absent from sampled logs.
- [ ] Telemetry failure does not block gameplay or create unbounded buffering.
- [ ] Spend cap and queue kill switch work under load and preserve accepted-job outcomes.
