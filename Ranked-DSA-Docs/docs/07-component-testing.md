# 07 — Component-by-component testing

Test components independently before using an end-to-end result as evidence. For each row capture build ID, environment, fixture/seed, expected/actual result and sanitized artifact path. Every required case must pass; a skipped dependency is BLOCKED, not PASS.

| Component | Positive checks | Failure and boundary checks | Pass criteria |
|---|---|---|---|
| Frontend | home/profile/editor/run/submit/result/history/leaderboard; 360/768/1280px; keyboard flow | reload while judging; offline; stale event; expired auth; double click; long statement and Unicode source | server state shown consistently, drafts preserved appropriately, clear actionable errors |
| Auth/API | valid session, owner access, paginated queries | missing/expired/forged token; wrong issuer/audience; CSRF; wrong Origin; foreign match ID; malformed JSON; 64 KiB source boundary | correct 4xx; no protected data; rejected requests never create judge jobs |
| MatchmakerDO | oldest compatible pair, widening, leave, leases | 100 joins at once; two tabs; join/leave race; odd player count; no eligible problem; crash after reservation | one active membership/account and exactly two distinct players/room |
| MatchDO | ready/countdown/start/run/submit/end | duplicate event; alarm late; restart/hibernation; equal-ms AC; reversed verdict order; deadline exact boundary | legal durable transitions, deterministic outcome and no early reveal |
| D1 | seed, projection, settlement, leaderboard and history | duplicate settlement; zero-row optimistic update; injected transaction error; stale rating version; outage | all-or-nothing ledger/counters and retry convergence |
| Problem bank | public/private serialization; references; version pinning | empty bank; exposed problems; bad expected answer; generator nondeterminism; retired version | no hidden data leak; known correct and incorrect solutions classified correctly |
| Judge adapter | Python samples and suite; bounded verdict response | cold start timeout; stale attempt; forged callback; cancellation | correct taxonomy and no infrastructure failure labeled contestant failure |
| Sandbox runtime | real isolated execution under limits | memory/fork/disk/output/network/process/control-service probes | all security checks pass and no cross-attempt residue |
| Ratings | equal/different ratings, win/loss/draw, forfeit, no contest | replay; concurrent settle; overflow/type errors; version mismatch | paired deltas sum to zero, exactly one update, no change for unrated/no contest |
| Reconnection | refresh/network drop/hibernation during play | grace expiry; simultaneous disconnect; old connection resumes | same authoritative snapshot and documented outcome |
| Deployment | staging resources, route/assets, private bindings, secrets | missing secret; mismatched image; stale schema; incorrect env IDs | health clearly fails and no production cross-binding |
| Observability | request→match→submission→job correlation | log backend unavailable; high-cardinality inputs; secret-like source | useful bounded telemetry, no source/test/credential leakage |

## Required race fixtures

1. A submits first; B second; B gets AC first; A eventually AC. A wins.
2. Same receipt millisecond, both AC. Draw regardless of response order.
3. A early pending job fails infrastructurally; B later AC. Retry A, then no contest if unresolved at bound.
4. Pre-deadline accepted submission finishes after deadline. It remains eligible.
5. Submission arrives exactly at endsAt. It is rejected without execution.
6. Disconnect expires while an earlier AC is pending. Resolve accepted work before forfeit.
7. Final result persists but D1 fails; room restarts. Outcome unchanged; one eventual rating settlement.
8. Pair reservation persists but room-create response is lost. Recover the same room.
9. Forged verdict has correct submission ID but old attempt token. Ignore and audit it.
10. Cleanup fails after successful judgment. User result completes while durable cleanup retries; resource leak alarm triggers if overdue.

## Exit checklist

- [ ] Unit checks pass for pure rule logic.
- [ ] Local Workers/DO/D1 integration checks pass.
- [ ] Real Docker judge and security checks pass locally.
- [ ] Two-browser walkthrough passes with real judge.
- [ ] Equivalent cloud-specific checks pass on staging.
- [ ] Failures have reproducing fixtures and are fixed before moving to the load gate.
