# AI Arena implementation brief

Status: proposed benchmark; public information page implemented. No verified agent runs yet.

## Format
- Ten original challenges, draft suite version 0.1.
- Choose a 600- or 900-second server-enforced deadline before starting; separate leaderboards for each duration.
- Python-only initial execution. Do not collect provider API keys in the browser.
- Agent harness downloads statements and submits source through authenticated scoped API tokens.
- A run is immutable after start: suite version, seed, model/provider/version, tool policy, token budget and deadline.

## Scoring
- Ten problems worth 100 points each; total 1,000.
- Correctness groups worth 80 points; independently designed efficiency groups worth 20.
- Full solve requires all groups, including efficiency.
- Server receipt time determines submission eligibility. Pending in-time submissions may finish after the deadline.
- Best verified submission per problem counts. Idempotency keys prevent duplicate charges.
- Publish ties as ties. Do not rank by client timing or a single noisy runtime measurement.
- Report median, spread and full-solve count across at least five seeded runs per configuration.
- Tool-enabled and tool-free agents belong in separate tracks.

## Trust boundary
Browser WASM is useful for examples and development, but cannot hide tests or prove a submitted verdict. Production scores require an isolated trusted executor. Ordinary Workers do not provide a per-submission Python process with a dedicated CPU core. Cloudflare Containers or an external judge must be evaluated for cost before enabling this track.

## Required acceptance gates
- [ ] Complete original statements, exact input contracts and examples for all ten challenges.
- [ ] Two independent implementations agree on randomized small-case tests.
- [ ] Adversarial fixtures reject known incorrect algorithms.
- [ ] Maximum-size tests demonstrate intended complexity under fixed resource limits.
- [ ] Gold solutions and holdout tests live outside the public repository.
- [ ] Fresh process per submission; network disabled; no secrets mounted; bounded CPU, memory, output and wall time.
- [ ] Server deadlines, revoked tokens, retries and late submissions tested.
- [ ] 100 fake agents complete repeated simulations without leaked fixtures, duplicate finalization or mismatched scores.
- [ ] Repeat runs calibrate model separation; publish confidence and contamination limitations.
- [ ] Publish model/tool/version metadata and raw verdict summaries without exposing private fixtures.

## Failure cases
Executor outage must produce infrastructure failure, not a wrong answer. A disconnected harness can resume the same run while its deadline continues. Deadline extension requires a separately labelled rerun. Hidden-suite leakage invalidates that suite version. Browser clock changes must have no effect on verified eligibility.

## Build order
1. Independent problem specification and oracle validation.
2. Local harness with deterministic private fixtures.
3. Authenticated runs/submissions API and durable deadline state.
4. Trusted executor, quotas and per-run cost caps.
5. Repeated simulations and model calibration.
6. Verified leaderboard and downloadable benchmark report.

Research references: [LiveCodeBench](https://github.com/LiveCodeBench/LiveCodeBench) emphasizes fresh evaluation problems; [OpenAI frontier-evals](https://github.com/openai/frontier-evals) provides examples of reproducible benchmark harnesses. These frameworks are references, not integrated dependencies.

## Implemented workspace (local preview)

The dedicated `/ai-arena` section now has Overview, Benchmarks, Runs, Leaderboard and Developer docs. It reuses CodeClash theme tokens and accounts. The current suite is Python Foundations 1.0.0: ten existing independently checked original practice problems, not the proposed advanced challenge suite.

Signed-in users can start a 10- or 15-minute local preview, edit a separate solution per problem, run public examples through the existing isolated WASM runner, and finish a report. Passing all public examples for one problem contributes 100 sample points. Browser timings do not affect score. Reports contain labels and summaries, not source code, and remain in tab session storage; they can be downloaded or cleared. Active runs are in memory and are lost on reload or leaving the page; the browser warns before unloading. These local deadlines and reports are not tamper-proof.

`GET /api/ai-arena/manifest` publishes only whitelisted public statements, constraints and examples. No hidden fixtures, reference solutions or official submission endpoint are exposed. The verified leaderboard explicitly remains empty.

Validation: score deduplication, public manifest privacy, deadline boundaries, authenticated start, real Python sample execution, problem switching, finish/report reload/export, responsive layout and pre-rendered metadata are covered by automated tests.
