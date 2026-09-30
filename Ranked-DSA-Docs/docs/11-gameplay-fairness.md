# 11 — Gameplay fairness and validation

Infrastructure correctness does not prove the game is fair or enjoyable. Validate rule behavior separately from latency and capacity. These are release experiments to perform, not measured findings.

## Competitive fairness invariants

- Same immutable statement, examples, Python runtime, checker and resource limits for both players.
- No problem disclosure before authoritative start. Delivery is as close as possible, not literally simultaneous across the internet.
- Earliest correctly submitted solution by server receipt wins; slow judge scheduling cannot overturn an earlier receipt. Runtime/memory are diagnostic, not tiebreakers.
- Client clocks, repeated clicks and manipulated WebSocket frames cannot improve ordering.
- Earlier accepted work remains eligible through deadline, disconnect and forfeit adjudication.
- Exactly one terminal result and one rating settlement; an unresolved infrastructure error is not a defeat.

## Controlled experiments

| Experiment | Method | Acceptance |
|---|---|---|
| Reveal skew | both clients log receipt relative to server start across 50 matches in target region | p95 difference ≤250 ms; report worst case and RTTs |
| Judge order bias | swap completion order for 100 paired submissions, including earlier WA and earlier AC | expected result unchanged in 100% of cases |
| Same-time tie | force server receipt millisecond equality in deterministic tests | draw for both AC, regardless of callback order |
| Network conditions | 30/100/250 ms RTT, jitter, 1% packet loss and reconnect | state converges, rules visible, measured receipt-latency disadvantage documented |
| Clock spoofing | shift client clock ±1 hour during match | no deadline or result change |
| Runtime parity | run identical accepted/reference programs on both positions across repeated starts | same verdicts; investigate systematic resource variance |
| Rating accuracy | equal/unequal ratings, draw, forfeit, no contest and replay | formula and counter invariants pass |
| Problem quality | reference solution, brute-force oracle on small inputs, generated/adversarial cases | no known incorrect solution accepted; all valid references pass with headroom |

Do not subtract client-reported latency from solve times. Server receipt inherently favors lower network delay; disclose this and limit the first ranked cohort to the tested region. Regional matching and reveal buffering can reduce differences, but must be measured before claims of global fairness.

## Problem-bank launch gate

- [ ] At least 30 reviewed original/licensed easy/medium problems for a limited closed alpha; plan replenishment before repeat exposure exhausts the bank.
- [ ] Each has statement/constraints/examples, reference solution, edge cases, incorrect/slow solutions and reviewer signoff.
- [ ] Hidden suites cover boundaries, empty/minimal/maximal allowed sizes, duplicates, negative values where allowed and adversarial complexity.
- [ ] Limits are calibrated on the production image/instance class with headroom; a reference does not pass only by luck.
- [ ] Match difficulty policy is versioned: start with easy problems at lower pair-average ratings, then medium after a documented threshold; verify both players see the same choice.
- [ ] A previously exposed problem is excluded for that player; empty eligibility cancels transparently before start.

## Human playtest

Recruit a small consenting closed-alpha cohort across beginner/intermediate/experienced levels. Target at least 10 pairs and 30 completed matches. Record queue wait, solve time, draw/forfeit rates, reconnection confusion, clarity of result and whether players choose another match. Use short post-match questions: “Was the result understandable?”, “Did both players have the same opportunity?”, “Was the difficulty appropriate?”

Proposed acceptance: ≥90% can complete the flow without assistance; ≥80% understand the result and rating change; no unresolved reproducible fairness defect; median difficulty feedback within one step of intended level on a five-step scale. Small-sample satisfaction does not establish retention. Report sample size and uncertainty.

## Anti-abuse policy

State that outside AI assistance is prohibited in the initial human-ranked mode, with a reporting/review process. Technical measures cannot guarantee detection. Rate limits, repeat-opponent cooldowns, unrated direct rematches and exposure tracking reduce easy abuse. Never auto-ban solely for paste events, focus changes, fast solves or source similarity. Restrict moderator access and record reviewed rating corrections as compensating ledger events, not silent history edits.

## Go/no-go

Block ranked launch for incorrect outcomes, uneven execution settings, early reveal, exploitable repeated settlement, or a known broken problem. Fix the rules/fixtures and rerun deterministic, staging and affected simulation gates. Product enjoyment issues can remain explicitly tracked for closed alpha, but fairness defects cannot be waived by a good load-test score.
