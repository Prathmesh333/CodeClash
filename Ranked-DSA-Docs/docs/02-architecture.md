# 02 — Architecture

## Components

```text
React / Vite / TypeScript / Monaco
          | HTTPS + WSS (authenticated, same origin)
Worker API + static assets
          |                 |
MatchmakerDO -----> MatchDO  |-----> D1
 queue/reservations  state  |       profiles/problems/history/ratings
                     |
             private Judge Worker / coordinator
                     |
             Sandbox / Containers
             isolated Python execution
```

Use a private service binding to the Judge Worker. The API must not expose Sandbox commands, shell APIs, preview ports or arbitrary sandbox identifiers. A judge coordinator DO can hold durable jobs and bounded concurrency leases; this is an internal helper, not another database service. No Redis, separate VM judge server or R2 is required for the MVP.

## Ownership

| Owner | Authoritative data |
|---|---|
| Identity provider + API | Verified identity and application session |
| MatchmakerDO | Queue membership, reservations and one active rated match per account |
| MatchDO | Players, immutable problem version, state, timestamps, receipt ordering, verdict acceptance and final result |
| Judge coordinator | Durable job IDs, attempt tokens, worker leases and bounded dispatch |
| D1 | Problem bank and durable projections: submissions, results, rating ledger, leaderboard |
| Browser | Unsaved code draft and UI preferences only |

Start with one matchmaking DO per supported region and one active region for the alpha. Server assigns region; the browser cannot enter multiple partitions. If multi-region queues are added, introduce a global membership owner before allowing cross-region queueing. Match count scales through one MatchDO per match; one huge matchmaking object is not an unlimited-capacity claim.

## Submission and result flow

1. API authenticates, validates origin/payload and routes to the owning MatchDO.
2. MatchDO verifies participant, state, deadline, rate limit and idempotency key. Persist receipt, source hash, source and durable outbox job before acknowledging acceptance.
3. Dispatcher sends job to judge with immutable problem/runtime digests. At-least-once delivery is expected. The same logical submission ID survives retries.
4. Judge creates an isolated sandbox attempt, executes the suite under enforceable limits and returns a structured verdict through a private authenticated path.
5. MatchDO accepts only the current attempt token and expected source/problem digests. Deduplicate repeated callbacks. Compute result using receipt order.
6. Persist final result and a settlement outbox atomically in MatchDO storage. Broadcast outcome. Retry D1 settlement until confirmed.
7. D1 settlement commits result, two rating events and both user counters atomically and idempotently. Release active membership only after ranked settlement.

DO storage, D1 and external execution do not share a transaction. Use durable intents, acknowledgments and reconciliation. Never assume a callback, HTTP request or alarm executes exactly once. DO methods may interleave around awaits: use storage transactions and explicit state/version checks around transitions.

## Recovery and lifecycle

- Persist deadlines and schedule DO alarms. Do not depend on an in-memory interval for correctness.
- Restore WebSocket attachments and state after hibernation; send authoritative snapshot after reconnect.
- A scheduled reconciliation Worker sweeps stale D1 outbox projections and known active-job records; DO alarms remain the primary owner-local retry mechanism.
- All transitions must be repeatable after crash between persist and send. Side effects carry stable IDs.
- Terminate expired judge attempts and run periodic cleanup against tracked sandbox IDs; cleanup must survive failed requests.
- Use per-submission-attempt sandboxes initially. Measure cold-start cost before considering reuse. Any future pooling requires isolation/reset evidence and updated threat review.

## API surface

`GET /api/me`, `GET /api/leaderboard`, `GET /api/matches`, `GET /api/match/:id`, `GET /api/problems/:id` (public projection and reveal checks), `POST /api/matchmaking/join`, `POST /api/matchmaking/leave`, `POST /api/match/:id/ready`, `POST /api/match/:id/run`, `POST /api/match/:id/submit`, `POST /api/match/:id/forfeit`, `POST /api/match/:id/rematch`, `GET /api/match/:id/ws`.

The profile/history endpoints require auth. Every match endpoint verifies membership; unpredictable IDs do not replace authorization. Health endpoints provide sanitized liveness/readiness separately; an expensive live sandbox startup is not a liveness check.

## Architecture acceptance

- [ ] Killing/restarting each owner during every transition produces either recoverable progress or a visible no-contest state.
- [ ] No user can have two active rated matches or two rating writers racing for that user.
- [ ] No browser or contestant process can mutate verdicts, ratings, deadlines or hidden tests.
- [ ] Every side effect has an idempotency identity and a documented retry owner.

Cloudflare documents hibernation as a way to retain WebSockets while an idle object leaves memory; application state must be restorable. See [WebSocket guidance](https://developers.cloudflare.com/durable-objects/best-practices/websockets/).
