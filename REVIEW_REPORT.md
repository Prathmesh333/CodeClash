# Review and repair — 2026-09-28

Reviewed the current files and OpenCode's status reports. The folder has no Git history, so the review could not compare changes against a prior commit.

## Repairs

1. **Deadline fairness:** a disconnect grace expiring after the match deadline no longer changes a deadline draw into a loss. Added a regression that failed before the fix.
2. **Rematches:** both players receive the next room ID. The old room saves and broadcasts it, with an alarm-driven recovery lookup if notification is interrupted. The lookup runs outside the room gate to avoid circular waits with matchmaking. Repeated rematch creation recovers the reserved room ID.
3. **Submission durability:** the receipt, source and recovery alarm now commit together in Durable Object storage. D1 is an idempotent, retryable projection using that stable submission ID. Verdicts are saved before database projection; database downtime cannot erase a completed judge response.
4. **Storage and messages:** code and example output use separate records instead of growing the single room record beyond its storage limit. Existing inline room payloads migrate on save. Example output in snapshots is capped at 2,048 characters per run to bound WebSocket messages; the durable record keeps the original bounded output.
5. **Problem consistency:** a room pins the problem statement and hidden suite when initialized. Later problem-bank updates cannot change an ongoing match. Existing rooms pin the currently available version on first access; their historical version cannot be reconstructed.
6. **Recovery alarms:** caught failures explicitly rearm recovery. Elapsed cutoffs no longer schedule an alarm every 100 ms while verdict resolution is pending.
7. **Client lifecycle:** switching sidebar pages keeps the match connection mounted. Queue requests no longer overlap or continue polling idle players. Replaced tabs stop reconnecting against each other. WebSocket heartbeats and broadcasts revalidate session expiry/revocation, including silent sockets.
8. **Judge supervision:** normal completion is awaited before cleanup kills the process group. Contestant stderr is no longer trusted to identify infrastructure failures; bubblewrap's private JSON status channel attests startup. CPU soft/hard limits differ so the CPU deadline can be classified. New mocked supervision tests execute no submitted code.
9. **Evidence:** rating-ledger checks require both participants' events. Phase 0's misleading local PASS is changed to BLOCKED because isolation has not been proven. CI includes the trusted Python supervision tests. The capacity checklist validator now rejects repeated seeds, incomplete match counts, baseline profiles, missing measurements and failed latency/cost thresholds; its output explicitly requires independent inspection of raw evidence.

## Verification

Verification resumed on 2026-09-29. Types, 31 TypeScript unit tests, seven trusted Python supervision tests, the frontend build and all three browser tests passed. The browser flow covers both players entering the rematch. The final real Worker/D1 integration rerun also passed all 17 tests (82 seconds). See IMPLEMENTATION_STATUS.md for the command summary. The baseline before these repairs passed types, 18 unit tests, 17 integration tests and the build. New regressions extend coverage beyond that baseline.

The first browser rerun found overlapping queue traffic causing the 20-second ready check to expire on this host. The client polling fix addresses that accumulation. Room persistence also avoids redundant writes, settled rooms do not rewrite state on heartbeats, and the client waits for a heartbeat response before sending another. A subsequent run reached the rematch and exposed a test assertion still using the default 5-second wait despite the local server's multi-second responses; that assertion now uses the same 15-second bound as the rest of the multiplayer flow. Game deadlines remain unchanged.

Mocked recovery tests establish application behavior with controlled database and judge responses. They do not prove actual Durable Object crash atomicity, container security or multiplayer capacity.

## Remaining release blockers

- Docker is unavailable here. Real Python execution, bubblewrap namespaces/status descriptors, resource enforcement and Cloudflare Sandbox behavior are unverified. Keep judging disabled until the real fixtures pass.
- No configured Cloudflare staging account, OAuth credentials, deployed image digest or measured account quotas.
- Real judge callback/crash/fault scenarios and production recovery need staging verification. No global judge admission cap, orphan cleanup inventory, retention policy or measured spend controls yet.
- Only six unreviewed problems; the required independent review and larger simulation bank are missing.
- The 100-fake-player gate remains NOT RUN: 50 simultaneous rooms, 20 rounds, three distinct seeds, followed by a normal-clock soak and the documented latency/invariant/cost checks.
- Local workerd remains slow and sometimes drops connections. Local browser success is functional evidence, not a capacity or latency claim.

## Technical references

- [Cloudflare Durable Object limits](https://developers.cloudflare.com/durable-objects/platform/limits/): the app uses SQLite-backed objects, whose individual key/value records must remain within the documented 2 MB limit.
- [Cloudflare alarms](https://developers.cloudflare.com/durable-objects/api/alarms/): exceptions swallowed by application code need explicit recovery scheduling.
- [Bubblewrap supervision source](https://github.com/containers/bubblewrap/blob/main/bubblewrap.c): the child closes the private JSON status descriptor; normal exit-code reporting distinguishes pre-exec setup failure. Deployment must verify the actual installed version and timeout behavior with the real fixtures.

## Local handoff

The existing development database was missing migration `0002_submissions.sql`; it has now been applied successfully. The development app was restarted at http://127.0.0.1:5173 with judging disabled. No Cloudflare deployment or capacity test was performed.
