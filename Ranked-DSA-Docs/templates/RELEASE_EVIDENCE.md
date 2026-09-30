# Release evidence — fill after implementation

Status: NOT RUN

## Build and environment

- Commit / release:
- Date / owner:
- Environment / region / domains:
- Node / pnpm / Wrangler / SDK versions:
- Worker build IDs / image digest / compatibility date:
- Schema / protocol / rule / problem-suite versions:
- Account quotas / configured admission cap:
- Budget / pricing date / actual spend:

## Gate results

| Gate | Status (NOT RUN/PASS/FAIL/BLOCKED) | Command / fixture / seed | Evidence path | Failures or limitations |
|---|---|---|---|---|
| Fresh local setup | NOT RUN | | | |
| Unit/integration/components | NOT RUN | | | |
| Judge correctness/security | NOT RUN | | | |
| Two-browser full flow | NOT RUN | | | |
| Protocol/rating recovery | NOT RUN | | | |
| Staging smoke/security | NOT RUN | | | |
| 100 players, seed 101, 20 rounds | NOT RUN | | | |
| 100 players, seed 202, 20 rounds | NOT RUN | | | |
| 100 players, seed 303, 20 rounds | NOT RUN | | | |
| 60-minute normal-clock soak | NOT RUN | | | |
| Fairness/human playtest | NOT RUN | | | |
| Alerts/spend controls | NOT RUN | | | |
| Rollback/restore | NOT RUN | | | |

## Per-run capacity record

Players / completed rounds / expected and actual terminal attempts / active room peak / active judge peak / judge mode / timer profile / observed duration:

API p95/p99 / WS p95 / queue p95 / judge queue p95 / verdict p95/p99 / cold-start distribution / reconnect success / settlement lag:

Wrong winners / duplicate memberships / duplicate settlements / security leaks / lost jobs / cleanup orphans (all must be zero):

Injected faults and expected no-contests / unexpected errors / first-run failures / excluded samples with rationale:

Ledger reconciliation / sandbox inventory / raw histogram links / trace links:

## Recovery and release decision

- Backup checkpoint / restore drill RPO and RTO:
- Known compatible rollback builds/image:
- Open defects with severity/owner:
- Measured safe operating cap and margin:
- Release checklist complete:
- Decision (GO / NO-GO / BLOCKED):
- Responsible owner and time:
- Follow-up actions:

Do not mark PASS from planned tests, mocked evidence or missing artifacts.
