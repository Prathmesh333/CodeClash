# Ranked question bank

The local ranked pool contains 20 original questions: 11 Easy and 9 Medium. There are 499 total example and hidden cases. Questions are revealed only after both players ready up and the countdown ends.

## Contents

| Question | Topic | Difficulty |
|---|---|---|
| Signal pair | Hash maps | Easy |
| Quiet window | Sliding window | Easy |
| Balanced beacons | Stacks | Easy |
| Missing crate | Arrays | Easy |
| Unique frequency | Strings | Easy |
| Sorted checkpoint | Binary search | Easy |
| Cargo streak | Dynamic programming | Easy |
| Distinct channel | Sliding window | Medium |
| Next taller | Monotonic stack | Medium |
| Rain reservoir | Two pointers | Medium |
| Range ledger | Prefix sums | Easy |
| Packet groups | Sorting / sets | Easy |
| Inversion parcels | Merge sort | Medium |
| Coin terminal | Dynamic programming | Medium |
| Stair signals | Dynamic programming | Easy |
| Relay distance | Breadth-first search | Medium |
| Network islands | Disjoint sets | Medium |
| Meeting dock | Greedy | Medium |
| Grid courier | Dynamic programming | Medium |
| Tile workshop | Number theory | Easy |

Every question has an explicit input/output contract, constraints, Python starter code, public examples, hidden cases, a project-authored reference solution, and private explanation with time/space complexity. Existing questions received additional edge cases. New questions include deterministic generated cases and larger inputs. Cases do not exhaust every valid input or prove an arbitrary program’s asymptotic complexity.

## Ranked selection and privacy

- Exclude questions already exposed to either player.
- Prefer Easy below an average pair rating of 1400; prefer Medium at or above 1400.
- Select randomly among the preferred difficulty; fall back to another unseen difficulty if needed.
- Both players receive the same pinned problem and server clock.
- Reference solutions, editorials and hidden tests are excluded by an explicit public-field allowlist when seeding D1. They are not imported into the frontend.
- Browser Run checks public examples only. Ranked Submit still requires the isolated server judge.

No practice library, public hints or public solutions were added, following the request to prioritize ranked matches.

## Validate and load

```sh
pnpm test:problems
pnpm db:seed:local
pnpm test:integration
pnpm test:e2e
```

`test:problems` runs only these project-authored reference solutions with host Python. It never accepts player code. It checks every fixture, rejects duplicate IDs and missing editorials, checks payload/output bounds, and requires cases that defeat a constant example answer. The check runs in CI. This is a content-correctness check, not a sandbox security test or a judge performance benchmark.

The seed preserves user data and existing public problem definitions. It can refresh private fixtures when the public definition and version match exactly. Rooms already created retain their pinned fixtures. If a statement, constraint, expected result contract or language contract changes, publish a new problem ID/version rather than silently editing an active definition.

## Simulation preparation

```sh
pnpm problems:solutions
```

This writes `work/reference-solutions.json` for the existing `SIM_SOLUTIONS_FILE` input. It contains private answers; keep it out of static assets. A real judge and authenticated test identities are still required for the simulation.

The repeated 100-player release gate has **not** been run. Twenty questions support a limited alpha pool; exposure exclusions can exhaust eligible questions earlier when opponents rotate. Grow the reviewed bank or use an isolated simulation fixture pool before claiming 20-round capacity across arbitrary pairings. Do not reset production exposure to make a test pass.

## Verification result

All 499 distinct cases passed the reference checker. Type checking, 35 unit tests, 17 Worker/D1 integration tests and all 3 browser tests passed. Local seeding was run twice successfully; existing public definitions and user data were preserved. Browser tests covered pairing, synchronized reveal, Python Run, unavailable-judge handling, forfeit and rematch.

The client now retries one malformed upstream 5xx for a read, a keyed submission or an idempotent queue join. Valid API errors are not retried.

## Remaining ranked release work

- [ ] Verify the actual isolated server judge and its security boundaries.
- [ ] Run every reference through that judge to check its per-test and whole-job budgets.
- [ ] Have humans review wording, difficulty and competing valid interpretations.
- [ ] Calibrate performance thresholds on the hosted runtime; browser timings do not establish fairness.
- [ ] Verify staging and complete the repeated 100-fake-player simulation gate.
