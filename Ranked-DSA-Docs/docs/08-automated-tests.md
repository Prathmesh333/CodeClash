# 08 — Automated tests and command contract

The implementation must create the scripts below in the repository root. This documentation ZIP does not supply executable scripts. Pin test tooling with the application lockfile. Suggested tools: Vitest with Cloudflare's supported Workers test integration, Playwright for browsers, and a Node/TypeScript WebSocket simulator for stateful bot players. Confirm current compatibility before selecting exact versions.

## Required commands

| Script | Required behavior |
|---|---|
| `pnpm lint` | static style and unsafe-pattern checks |
| `pnpm typecheck` | all workspaces and protocol types |
| `pnpm build` | web/Worker builds; record artifact IDs |
| `pnpm test:unit` | rating, comparator, state transition, pairing, deadline and serialization tests |
| `pnpm test:integration` | real local Workers/DO/D1; migrations, outbox and idempotency |
| `pnpm test:judge` | real isolated Docker execution of trusted correctness fixtures |
| `pnpm test:security` | bounded adversarial fixtures inside isolated judge only |
| `pnpm test:e2e` | two independent authenticated browser contexts and full game |
| `pnpm test:multiplayer` | deterministic race, reconnection and crash fixtures |
| `pnpm test:staging` | real hosted API/DO/D1/Sandbox smoke and recovery checks |
| `pnpm simulate` | stateful fake-player CLI in document 10 |
| `pnpm evidence:verify` | validate report completeness, thresholds and invariants; nonzero exit on missing data |

## Layering and fixtures

Use deterministic fake clocks for unit rules, but real wall clocks for latency measurements. Inject a judge adapter for race tests so completion order is controlled. Label reports `judge=mock` or `judge=real`; mock runs cannot satisfy judge, end-to-end cloud or capacity release gates.

Every test has independent identities or namespaced run IDs. Fixtures include AC, WA, RE, TLE, MLE and OLE solutions; an infrastructure-error adapter; an immutable problem version with known digest; and forced callback permutations. Adversarial code must never execute during imports/discovery or on the test runner host.

Property-based tests generate interleavings of joins, leaves, callbacks, reconnects, alarms and retries. Assert legal terminal states, at most one active match/account, two distinct players/match, immutable final result and no duplicate rating effects. Save failing seed and minimized event trace.

## Browser suite

Use two separate contexts, not two pages sharing one session. Exercise editor input, public run, wrong answer, accepted submit, shared result, rating persistence, history and rematch. Test auth expiry and refresh while judging. Assert server state through read-only test evidence endpoints limited to local/staging, not by mutating D1 to force outcomes. Capture screenshots/traces only on failure; redact secrets and private source before retention.

## Integration and recovery suite

Inject failure at “persisted but not sent,” “sent but response lost,” and “D1 committed but acknowledgment lost.” Restart DO owners and exercise hibernation. Check actual rows and event counts. Do not use a mock database to claim transaction correctness. Run migration tests against empty and prior-release schema. Validate authenticated private-service calls cannot be made via public routes.

## Minimum test policy

- Every product acceptance criterion maps to a test ID or a recorded manual check.
- Every state transition, outcome precedence and rate-limit boundary has deterministic coverage.
- Judge safety and settlement tests are required; high aggregate coverage cannot replace them.
- Retried flaky tests remain a failure to investigate. Gate reports include first-run failures.
- Report skipped tests, environment limitations and test-only configuration explicitly.
- CI artifacts include JUnit/JSON results, version manifest, seed, durations and sanitized failure traces.

Local gate example after scripts exist:

```sh
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:integration
pnpm test:judge
pnpm test:security
pnpm test:e2e
pnpm test:multiplayer
pnpm build
```
