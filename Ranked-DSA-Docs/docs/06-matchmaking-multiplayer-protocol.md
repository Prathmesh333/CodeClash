# 06 — Matchmaking and multiplayer protocol

## Queue ownership

MatchmakerDO owns membership and pairing. A membership is `IDLE`, `QUEUED(ticket,joinedAt,lease)`, `RESERVED(matchId,token,expiry)` or `ACTIVE(matchId)`. Use authenticated account ID as the uniqueness key. Heartbeats renew queued leases; 30 seconds without renewal expires a ticket. Losing a browser connection does not immediately drop an active match.

Select oldest compatible pair where rating difference is within BOTH players' current widening windows. Avoid same opponent for 5 minutes by default. Require at least one eligible problem unseen by both accounts; do not silently replay an exposed ranked problem. Snapshot ratings and rule version at pairing.

Pair atomically inside the matchmaking owner: remove both queue entries and persist reservation before contacting MatchDO. Create room idempotently with the reservation token. Activate both memberships after room acknowledgment. An alarm reconciles incomplete reservations by asking the room whether initialization committed; release/requeue only if room was not started. Do not create a second room merely because the first RPC timed out. Leave/pair races serialize at the membership owner.

## Match state machine

```text
WAITING_READY -> COUNTDOWN -> ACTIVE -> RESOLVING -> FINISHED
       |             |          |          |
       +-------------+----------+----------+-> NO_CONTEST
       +-------------+-> CANCELLED (before start)
```

Only server transitions. Persist each transition with a monotonically increasing revision. `FINISHED`, `NO_CONTEST` and `CANCELLED` are terminal; D1 settlement is a separate pending/settled state. Client “submitted” is a UI state, not a match terminal state.

COUNTDOWN records `startedAt=serverNow+3000` and `endsAt=startedAt+1200000`. Reveal at or after startedAt, never by embedding the hidden statement in the countdown payload. Persist exposure records before delivering the statement; if this cannot be confirmed, cancel rather than falsely claiming the problem was unseen. Fetching the room after startedAt also advances the state if an alarm was delayed.

## Winner ordering

On acceptance, assign `receiptMs` and unique increasing `receiptSeq` inside MatchDO. Client clocks are ignored. Enqueue order controls admissibility; receiptMs controls the same-millisecond draw rule. An AC creates a candidate and enters RESOLVING. Stop accepting new hidden submissions, since they cannot beat that candidate. Resolve all previously accepted submissions with receiptMs ≤ candidate time; a later judge response can change the candidate to an earlier AC. Same-ms ACs from both players draw. Earlier WA/RE/TLE/MLE/OLE do not block a later AC once resolved.

At deadline, stop new submissions but adjudicate those already accepted. One AC wins by the rule above; no AC means draw. At disconnect-grace expiry or explicit forfeit, adjudicate all submissions received at or before the forfeit cutoff before applying forfeit. If no earlier AC resolves the game, one forfeiter loses; both grace-expired players yield no contest. Define precedence at equal time as accepted-solution adjudication first, then forfeit, then unsolved deadline draw.

The 60-second adjudication bound starts at the first resolution trigger and is not extended by retries. Any unresolved eligible infrastructure-failed job that could affect the result makes the match no contest at the bound. Cancel later irrelevant jobs and clean their sandboxes. Tests must cover all order permutations.

## HTTP contract

Mutations carry `Idempotency-Key` and bounded JSON. Submission body: `{ "language":"python", "source":"...", "problemVersion":1 }`. Server derives user/match context. A durable accepted job returns 202 with submission ID, receipt timestamp and status. Repeat key with same body returns same response; different body returns 409. Store the request hash through the match's retry retention window (default 7 days).

Errors use `{ "code":"MATCH_CLOSED", "message":"...", "requestId":"...", "retryable":false }`. Use 400 invalid schema, 401 unauthenticated, 403 unauthorized, 404 not found, 409 state/idempotency conflict, 413 too large, 429 throttled, 503 capacity/infrastructure unavailable. Avoid leaking existence of another player's private match.

## WebSocket envelope

```json
{
  "protocolVersion": 1,
  "type": "match.snapshot",
  "matchId": "opaque-id",
  "eventId": "opaque-event-id",
  "seq": 42,
  "serverTime": 1790000000000,
  "payload": {"state": "ACTIVE", "revision": 7, "endsAt": 1790001200000}
}
```

Server events: `queue.status`, `match.found`, `match.countdown`, `match.started`, `match.snapshot`, `submission.status`, `opponent.presence`, `match.resolving`, `match.finished`, `rating.settled`, `server.error`. Send account-level queue events on an authenticated queue socket or use a documented bounded polling fallback before room assignment.

Client events: `client.hello` (protocolVersion,lastSeq), `client.ping`, `match.ready`, `match.resync`. Gameplay mutations may stay on HTTP so retry behavior is uniform. Validate all incoming frames; cap at 16 KiB and reject unknown versions/types. Source is sent only over HTTP, never broadcast. Do not broadcast opponent test details or code.

## Reconnect and delivery

Use authenticated session cookie plus strict allowed Origin on upgrades; no long-lived token in URL. Validate match membership on each mutation even after handshake. Refresh/expired authentication must not bypass the room's membership rules.

Client reconnects with bounded exponential backoff (0.5, 1, 2, 4 seconds with jitter; then up to 10 seconds). Server returns snapshot including own outstanding submissions and settlement state. Client ignores duplicate/stale seq; a gap requests snapshot. Persist a bounded replay buffer if useful, but snapshot correctness must not depend on retention. Renew auth on expired session. State survives hibernation and process restart; local timers only render.

## Protocol acceptance

- [ ] Duplicate joins/leaves/readies/submissions/reconnects are safe.
- [ ] Two tabs, reversed network delivery and stale socket events cannot create illegal transitions.
- [ ] Queue owner crash during reservation and room crash during result commit recover without duplicates.
- [ ] Spoofed participant, rating, problem version, timestamps and verdicts are rejected.
- [ ] Restart after candidate AC preserves adjudication ordering and deadline.
- [ ] Both clients converge to identical final state despite lost/duplicated frames.
