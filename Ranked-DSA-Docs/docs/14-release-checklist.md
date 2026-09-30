# 14 — Release checklist

Release candidate: `<commit>` • owner: `<name>` • environment: `<name>` • date: `<UTC>`

All boxes below require linked evidence in templates/RELEASE_EVIDENCE.md. Unchecked means incomplete. This pack has not run application tests.

## Gate A — Local correctness

- [ ] Fresh setup and local migrations/seeds work from documented commands.
- [ ] Required stack is used; Python-only execution and no production test bypass.
- [ ] Two-browser full game and consensual unrated rematch pass.
- [ ] Every component in document 07 has evidence.
- [ ] Unit, integration, real judge, security, E2E and race suites pass.
- [ ] Source/public/hidden serialization boundaries verified.

## Gate B — Hosted staging

- [ ] Separate IDs, secrets, DO namespaces, D1 and auth callbacks verified.
- [ ] Real Sandbox runtime controls, denied networking and control-service protection pass.
- [ ] Cold start, timeout, restart, hibernation, retry, D1 outage and cleanup verified.
- [ ] Deployment/image/schema/rule versions recorded and compatible.
- [ ] Exactly-once rating effect survives concurrent duplicate settlement.
- [ ] Restore and compatible rollback drills completed with measured timing.

## Gate C — Capacity

- [ ] 100 players / 50 matches / 20 rounds × three seeds pass with real judge.
- [ ] 60-minute normal-clock soak includes full-deadline behavior.
- [ ] All latency/error/cleanup targets met per seed; no correctness or security violations.
- [ ] Burst, overload/backpressure and post-fault recovery pass.
- [ ] Measured safe user cap, account quotas and spend budget recorded.
- [ ] No mocked/accelerated-only result is presented as deployed capacity.

## Gate D — Fairness and game quality

- [ ] Server receipt order, equal-ms tie and deadline/forfeit precedence verified.
- [ ] Identical problem/runtime/limits and no early reveal verified.
- [ ] Problem-bank licensing, correctness, calibration and exposure rules reviewed.
- [ ] Human playtest conducted and result clarity thresholds met.
- [ ] Assistance/reporting policy and limitations are visible to users.

## Operations and launch

- [ ] Alerts reach the responsible owner; dashboard and runbooks work.
- [ ] Kill switch, bounded queues, rate limits, retention and spend limits verified.
- [ ] Backup checkpoint and rollback build/image references recorded.
- [ ] No unresolved high-severity correctness/security defect.
- [ ] Closed-alpha audience and published concurrency cap match measured evidence.
- [ ] Release owner records go/no-go; production smoke passes before queue opens.

## No-go and post-release

Wrong winner, rating double-apply, cross-user access, hidden-test leak or unenforced judge boundary is an immediate no-go. Missing cloud credentials means hosted gates are BLOCKED; local gates can still complete. Failed target means fix, remeasure and rerun affected gate; do not change thresholds retrospectively to label the same run a pass.

For the first 24 hours, monitor errors, judge latency, settlements, cleanup and spend. If limits fail, reduce admission or close queues and follow document 12. Record known noncritical limitations, a follow-up owner and date. Any material judge/protocol/rating change repeats relevant correctness, security and 100-player gates before promotion.
