# 13 — CI/CD

## Workflow design

Use the repository's existing CI provider or default to GitHub Actions. Pin third-party actions to reviewed commit SHAs, pin Node/pnpm and use a frozen lockfile. Build artifacts once per release candidate and record their digests. CI configuration is an implementation deliverable, not included executable YAML in this pack.

| Trigger | Jobs | Gate |
|---|---|---|
| Pull request | install, lint, typecheck, unit, local Workers/D1 integration, build | all pass; no skipped critical suite |
| Trusted PR / protected branch | Docker judge correctness/security; two-browser and race suite | runtime controls and main flow pass |
| Merge to staging branch | migration compatibility, image build, staged deploy, hosted smoke | exact commit and image recorded |
| Release candidate | staging component checks, three 100-player runs, normal-clock soak, fairness checks | full evidence report passes |
| Production release | backup/checkpoint, compatible migrations, judge/API/assets deploy, smoke | document 14 signed off |
| Scheduled maintenance | dependency checks, restore drill cadence, orphan reconciliation | issues tracked and critical failures notified |

Long-running load tests need explicit concurrency/spend bounds; run them on release candidates or when multiplayer/judge behavior changes, not on every documentation edit. A nightly small simulation can catch regressions but cannot replace the full gate.

## Credentials and environments

- Untrusted fork PRs never receive Cloudflare/auth secrets or privileged Docker-host access.
- Use a dedicated least-privilege deployment identity and CI secret store. Separate staging and production tokens/environments.
- Deployment jobs serialize per environment to avoid overlapping migrations and conflicting deployments.
- Protect production environment and branch according to the repository owner's policy. Record release approval as an operational gate, not permission for every local code edit.
- Mask secrets and avoid command-line credentials; use environment bindings/secret mechanisms.
- Cache dependencies keyed by lockfile; never cache session files or untrusted execution state.

## Migration and rollout order

1. Test migrations on empty and previous-release schema, including settlement trigger checks.
2. Run backward-compatibility checks for the prior Worker against the expanded schema.
3. Deploy judge build compatible with both old/new job envelope if active games exist.
4. Deploy API/DO protocol-compatible build and static assets; drain first if incompatible.
5. Run smoke tests and watch alerts. Failed smoke prevents opening new queues.
6. Remove deprecated fields/protocol support only after old active games and rollback window expire.

## CI artifacts

Save test summary with first-run failures, sanitized browser traces, bundle/image digests, dependency manifest, migration IDs, load seeds, metrics and release evidence. Failed jobs exit nonzero. Missing evidence fails `evidence:verify`; it does not become a warning. Keep gate artifacts at least 30 days for alpha releases, with sensitive raw artifacts restricted and minimized.

## Failure scenarios

Partial deploy: keep queue closed and inspect actual version matrix before retry. Migration committed but code failed: use compatible previous code or forward fix; do not blindly reverse D1. Image mismatch: fail readiness. Flaky test retry: preserve first failure and investigate. Expired token: stop deployment without logging its value. CI cancellation: accepted staging jobs still reconcile and sandbox cleanup still runs.

Acceptance: a commit can move through local checks, staging, evidence and controlled production release with a clear provenance chain and tested recovery steps.
