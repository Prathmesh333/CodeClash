# 16 — Sources, assumptions and decisions

## Provenance

Primary product input: user's referenced “CodeClash Game” conversation and explicit documentation request. The retrieved long planning message was truncated by the conversation tool; the visible requirements and user's complete explicit scope were used. No missing part is represented as a verbatim requirement.

This pack preserves the Cloudflare-first, Python-only MVP. Concrete values and policies added here are proposed implementation defaults: 20-minute matches, receipt-order wins, equal-ms draws, 30-second reconnect grace, K=32/1200 Elo, unrated direct rematches, per-attempt sandboxes, three 20-round simulation runs and named performance thresholds. Change them only through a decision record with updated tests.

## Official references checked 2026-09-27

| Source | Used for |
|---|---|
| [Sandbox overview](https://developers.cloudflare.com/sandbox/) | SDK purpose and platform relationship |
| [Sandbox security model](https://developers.cloudflare.com/sandbox/concepts/security/) | sandbox isolation boundary and application responsibilities |
| [Sandbox get started](https://developers.cloudflare.com/sandbox/get-started/) | current SDK setup and stable/preview distinction |
| [Sandbox deployment](https://developers.cloudflare.com/sandbox/guides/deploy/) | compatible package/image and deploy workflow |
| [Containers local development](https://developers.cloudflare.com/containers/guides/local-dev/) | Docker and local Wrangler development |
| [DO WebSockets](https://developers.cloudflare.com/durable-objects/best-practices/websockets/) | hibernation design |
| [DO hibernation example](https://developers.cloudflare.com/durable-objects/examples/websocket-hibernation-server/) | configuration/implementation reference for the builder |
| [D1 database API](https://developers.cloudflare.com/d1/worker-api/d1-database/) | transactional batch behavior |
| [Wrangler commands](https://developers.cloudflare.com/workers/wrangler/commands/) | CLI reference; check pinned version |
| [Containers pricing](https://developers.cloudflare.com/containers/platform/pricing/) | cost model inputs, recheck before spending |

Platform capabilities and API versions can change. These links support platform-level choices; they do not establish that this specific judge enforces all required controls, that the app has passed tests, or that a particular monthly bill is achievable.

## Phase 0 decision register

- Authentication provider and exact session/CSRF design.
- Stable or preview Sandbox SDK line, package/image digest and compatible Wrangler version.
- Supported sandbox network enforcement, privilege separation, CPU/process/file limits and protection of internal control services.
- Container instance class, measured startup/execution behavior and quotas.
- Alpha region, auth/data retention settings, approved domains and budget.
- Durable job dispatcher and settlement SQL implementation with concurrency evidence.

## Known limits of this deliverable

Documentation only: no app source, deployment, migration execution, judge test, security audit, capacity measurement or human playtest has been performed. All checklists begin unchecked. Project scripts and infrastructure placeholders must be implemented/resolved. The final ZIP contains the documentation folder and reusable Markdown evidence templates.
