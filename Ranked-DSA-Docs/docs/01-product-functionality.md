# 01 — Product functionality

## MVP contract

CodeClash is a real-time 1v1 game: first correct submission by authoritative server receipt order wins. Judge completion order never breaks a tie. Support account login, profile, rating/rank, wins/losses/draws, Python editor, public runs, hidden-test submissions, timer, queue, reconnect, results, match history, leaderboard and consensual rematch.

Defer other languages, AI assistance/analysis, runtime-based scoring, topic bans, tournaments, social/chat features, spectating and cosmetics. Use original or properly licensed problems with reviewed solutions and tests.

## Defaults to implement

| Rule | Default |
|---|---|
| Match duration | 20 minutes from authoritative `startedAt` |
| Countdown | 3 seconds after both players ready |
| Ready timeout | 20 seconds; cancel without rating if either absent |
| Starting rating | 1200; Elo K = 32; no rating floor in MVP |
| Opponent range | ±100 initially; widen by 50 every 10 seconds to ±400 |
| Queue timeout | 120 seconds, then let player retry; never silently exceed range |
| Disconnect | 30-second grace measured by server; game clock continues |
| Deadline | Accept submissions only while server receipt time is strictly before `endsAt` |
| Unsolved deadline | Draw after all eligible submissions resolve |
| Near simultaneous accepted solutions | Earliest server receipt timestamp; same millisecond is a draw |
| Infrastructure fault | Retry internally within adjudication bound; otherwise no contest, no rating |
| Adjudication bound | 60 seconds after deadline/forfeit or first accepted candidate, whichever begins resolution |
| Rematch | Both consent within 30 seconds; new match/problem, unrated in MVP to reduce farming |

Rank labels are display-only defaults: Bronze <1000, Silver 1000–1199, Gold 1200–1399, Platinum 1400–1599, Diamond 1600–1799, Master 1800–1999, Grandmaster ≥2000. They do not alter Elo.

## User journeys and acceptance criteria

### Account and home

- [ ] Login uses a configured identity provider; session is validated server-side.
- [ ] Home shows server rating, rank and Find Match. Logged-out user is directed to login.
- [ ] New user is created once when provider subject repeats; display name is unique and sanitized.
- [ ] Profile and history distinguish ranked, unrated, draw, forfeit and no contest.
- [ ] Leaderboard pagination is deterministic by rating descending, then user ID.

### Queue and start

- [ ] Joining twice returns the same queue ticket; two tabs cannot create two matches.
- [ ] Leave is idempotent. If pairing already committed, response supplies the assigned match.
- [ ] Match-found screen identifies opponent and rating; it reveals no problem before start.
- [ ] Both acknowledge ready; server sends countdown and reveals exactly the same immutable problem version when start time is reached.
- [ ] If no eligible unseen problem exists, cancel before reveal without rating and explain why.

### Play

- [ ] Editor supports Python, keyboard navigation, line numbers, accessible labels and visible focus.
- [ ] Run executes public samples only and displays bounded stdout/stderr and verdicts.
- [ ] Submit evaluates the pinned public+hidden suite; hidden inputs, expected outputs, stdout and per-case details are never returned.
- [ ] Wrong answer/runtime/time/memory/output limit verdicts leave the match playable before deadline.
- [ ] Show submission pending, judge delay and queue saturation without implying a wrong answer.
- [ ] Client timer derives from server timestamps and periodic clock-offset estimates; client clock changes cannot extend play.
- [ ] Reload restores authoritative state; local editor draft is namespaced by user and match and is cleared on logout.

### Finish and replay

- [ ] Both clients display the same immutable outcome and reason.
- [ ] “Rating pending” is shown until durable settlement completes; no guessed rating change.
- [ ] Result page includes own verdict history, solve receipt time, rating before/after and play-again actions.
- [ ] Opponent source remains private; public match views expose only approved fields.
- [ ] Rated requeue stays blocked until the user's previous rating settlement succeeds.

## Failure behavior

Auth expires: stop privileged requests and allow login; server timers continue. One disconnect beyond grace: forfeit, subject to earlier eligible submissions. Both disconnected beyond grace: no contest unless an earlier submission already establishes a result. Disconnect before start: cancel. Forfeit never defeats an earlier accepted submission still judging. D1 outage: persist result in MatchDO, display settlement pending and retry. Judge outage: stop new queues, resolve affected games as no contest after bounded recovery. Browser spoofed wins/timestamps: reject and log.

## Local usability gate

Test 360px, 768px and 1280px widths. At 360px offer separate problem/editor/results panels. Test keyboard-only flow, readable error messages, contrast, screen-reader status announcements and no keyboard traps in the editor. Two browser sessions must complete the full flow without database edits or manual verdict injection.
