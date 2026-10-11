# Question validation

## Current evidence

The bank contains 153 original questions. The 133 JSON practice questions have independent expected-answer implementations in `scripts/check-practice-oracles.py`. These check 3,231 published examples/fixtures and 100 generated inputs per question (13,300 additional comparisons). The random seed is fixed at 271828 for reproducibility.

Run from the repository root:

```powershell
pnpm test:practice:oracles
pnpm test:problems
```

The oracle script writes `artifacts/practice-validation.json`, containing the bank SHA-256, seed, counts and question IDs. CI runs both commands and retains the report. A mismatch exits with failure and includes the question, input and both answers. Missing oracle coverage also fails.

The generators respect the documented input domains. They cover empty arrays/strings where allowed, repeated values, signed sums, zero targets, different window widths, disconnected graphs, directed cycles, rectangular grids, touching intervals and all-negative tree values. Cases remain small enough for deliberately simple independent algorithms. Existing large fixtures are separately exercised by the reference-output check.

Oracle checks load only the project's reference imports and `solve` function. They must never receive player code. They do not replace the isolated browser runtime or server judge.

## Corrections

- Minimum target-sum span: explain latest prefix positions and exact sums, including negatives and zero, instead of a positive-only sliding window.
- Longest bounded distinct window: describe counts of array values instead of characters.
- Migration 0008 updates only these editorial explanations; account records, attempts, fixtures and problem versions are preserved.

## Acceptance before expanding duels

- [x] All 133 JSON questions have independent fixture checks.
- [x] Each JSON question has 100 reproducible generated comparisons.
- [x] Every question's project reference reproduces its published fixtures.
- [x] Private fixtures remain excluded from public question responses.
- [ ] Independently check the original 20 text-format questions, beyond reference-output consistency.
- [ ] Review every statement, complexity claim and explanation individually. Many explanations still need more detail.
- [ ] Test maximum documented input sizes and Python/browser time limits; small generated cases are not performance evidence.
- [ ] Exercise malformed submissions, browser cancellation and output bounds through the real runner.
- [ ] Run the repeated 100-fake-player multiplayer gate and inspect reconnect/cleanup evidence.
- [ ] Enable an authoritative isolated judge before issuing ranked ratings.

The 133 additional questions remain practice-only. Browser-reported passes remain unverified and do not change ratings. This report does not certify server isolation, full editorial quality or multiplayer capacity.
