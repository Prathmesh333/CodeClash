# Ranked-DSA-Docs

Work-mode-ready documentation for a Cloudflare-first competitive DSA game. Prepared 2026-09-27 from the supplied CodeClash conversation and the user's explicit scope. Start with [START_HERE.md](START_HERE.md).

## Reading order

| Stage | Document | Purpose |
|---|---|---|
| I — Local correctness | [01 Product functionality](docs/01-product-functionality.md) | User journeys, rules and acceptance criteria |
| I | [02 Architecture](docs/02-architecture.md) | Responsibilities, trust and recovery |
| I | [03 Local development](docs/03-local-development.md) | Setup and two-browser walkthrough |
| I | [04 Database and problems](docs/04-database-problem-schema.md) | Data contracts, indexes and settlement |
| I | [05 Judge security](docs/05-judge-sandbox-security.md) | Execution isolation and abuse controls |
| I | [06 Multiplayer protocol](docs/06-matchmaking-multiplayer-protocol.md) | Queue, state machine, events and races |
| I | [07 Component testing](docs/07-component-testing.md) | Individual subsystem checks |
| I | [08 Automated tests](docs/08-automated-tests.md) | Test suites and command contract |
| II — Cloudflare hosting | [09 Deployment](docs/09-cloudflare-deployment.md) | Staging, production and recovery |
| III — Capacity | [10 Load testing](docs/10-load-capacity-testing.md) | Repeated 100-player release gate |
| IV — Game validation | [11 Gameplay fairness](docs/11-gameplay-fairness.md) | Outcome fairness and playtests |
| Operations | [12 Observability](docs/12-observability-metrics.md) | Metrics, alerts and incident actions |
| Operations | [13 CI/CD](docs/13-ci-cd.md) | Build, test and promotion workflow |
| Release | [14 Release checklist](docs/14-release-checklist.md) | Evidence-based go/no-go |
| Delivery | [15 Roadmap](docs/15-phased-roadmap.md) | Ordered implementation milestones |
| References | [16 Sources and decisions](docs/16-sources-assumptions.md) | Official sources and assumptions |

Reusable records: [release evidence](templates/RELEASE_EVIDENCE.md), [decision log](templates/DECISION_LOG.md).

## Use in Work mode

Extract this ZIP and give Work mode the entire `Ranked-DSA-Docs` folder. Ask it: “Implement CodeClash using START_HERE.md. Begin with Phase 0 and complete each gate in order. Keep an evidence report and document any blocked external setup.”

## Document conventions

**Required** means a release condition. **Default** means a proposed product or engineering choice that can be changed with a decision record and updated tests. **Target** means a threshold to measure, not an observed result. **Placeholder** means account-specific information must be supplied.

This archive contains Markdown documentation only. It does not contain a running app, provision infrastructure or certify sandbox safety. The stack is based on current official references, but versions, quotas, prices and preview APIs must be rechecked when implementation begins. The conversation's rough monthly cost estimates are not a budget guarantee.
