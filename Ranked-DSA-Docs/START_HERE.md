# CodeClash — Work mode execution brief

Build a working Python-only, ranked 1v1 DSA game from this documentation. Read this file first, then README.md and the numbered documents. This pack is a specification, not an implemented application or a record of passing tests.

## Objective

Two authenticated players of similar rating join a queue, receive the same versioned problem after a three-second countdown, write Python, run public examples, submit against hidden tests, receive an authoritative result and exactly one rating update, and play again. Prove this locally before deploying. Prove staging correctness before capacity testing or production release.

## Required stack and boundaries

- React + Vite + TypeScript frontend, with Monaco Python editor.
- Cloudflare Workers API; Hono is an optional routing library.
- Durable Objects for matchmaking and one authoritative object per match; use WebSocket hibernation.
- D1 for accounts, immutable problem versions, submissions, completed matches and rating history.
- Cloudflare Sandbox/Containers for isolated Python execution. Never execute contestant code inside the API Worker or a normal host Python process.
- Python-only MVP. R2, other languages, AI, tournaments, chat and spectating are deferred.
- Serve frontend assets and API on one origin with Worker static assets where practical.

## Working instructions

1. Inspect the target repository and its instructions. Preserve existing work. Record what exists and what remains in an implementation status document.
2. Read the rule defaults in docs/01-product-functionality.md and the protocol in docs/06-matchmaking-multiplayer-protocol.md. They resolve ambiguities left in the idea discussion; record any deliberate changes before coding.
3. Start Phase 0: pin compatible toolchain versions, generate current Cloudflare configuration, prove the judge security controls and define the authentication provider. Do not copy outdated SDK examples blindly.
4. Implement vertical slices in docs/15-phased-roadmap.md. Each slice must include meaningful tests and reproducible evidence. Keep the command contract in docs/08-automated-tests.md working.
5. Validate all components separately, then the two-browser flow. Complete the required real-judge staging simulation: 100 fake players, 50 concurrent matches, 20 rounds, three seeded runs.
6. Produce a release evidence report using templates/RELEASE_EVIDENCE.md. Mark missing results as NOT RUN or BLOCKED. Never invent capacity, security, price or test results.
7. Use the deployment and release checklists before any public launch. Record actual resource IDs, domains, cost budget and account limits in private environment configuration.

## Definition of done

- [ ] Fresh checkout starts locally using documented commands and seeded demo accounts/problems.
- [ ] Two independent browser sessions complete queue → countdown → run → submit → result → rating → play again.
- [ ] Recovery, duplicate delivery, reversed verdict order, timeout and disconnection tests pass.
- [ ] Hidden tests, credentials and other contestants' data remain inaccessible to submitted programs and clients.
- [ ] Staging uses real Workers, DOs, D1 and Sandbox execution; test-only authentication cannot work in production.
- [ ] The repeated 100-player gate passes with zero correctness/security invariant violations and the latency thresholds in docs/10-load-capacity-testing.md.
- [ ] Rating settlement, disaster recovery, rollback, alerts and spending controls have evidence.
- [ ] Remaining limitations and measured operating capacity are stated plainly.

## Deliverables expected from the implementation agent

Application source; pinned dependencies and lockfile; generated Worker bindings; migrations and local seeds; versioned original/licensed problem fixtures; judge image and security tests; unit/integration/browser/simulation suites; deployment configuration; CI workflows; runbooks; and evidence report. Maintain a decision log using templates/DECISION_LOG.md.

## Decisions and unresolved environment inputs

Gameplay defaults are implementable as written. External inputs: Cloudflare account and available Sandbox plan/quotas, auth provider credentials, staging/production domains, deployment credentials and approved test spend. Continue local work while these are unavailable. No production claims may be based on a mocked judge.

All `pnpm` script names in this pack are an implementation contract to create, not scripts supplied in this documentation ZIP. Angle-bracket values are placeholders. Cloudflare commands must be checked against the pinned Wrangler version before use.
