# 05 — Judge and sandbox security

## Threat model and required boundary

Contestant Python is hostile. It may read files, inspect processes, open sockets, spawn children, allocate memory, flood output, forge output resembling a verdict or try to affect later executions. A timeout alone is not isolation. Python import bans and source keyword filters are not a security boundary.

Cloudflare provides isolation between sandboxes; processes inside one sandbox share resources. Application authentication and validation remain application responsibilities. See [Sandbox security model](https://developers.cloudflare.com/sandbox/concepts/security/). The controls below are CodeClash requirements to prove, not assumed SDK defaults.

## Execution design

1. Validate and persist source outside the sandbox, with a 64 KiB source limit and Python-only enum.
2. Allocate a unique sandbox per submission attempt; never share across users. Use opaque server-owned IDs including attempt identity. The contestant never chooses the ID.
3. Start a trusted supervisor and run the contestant as an unprivileged OS user with an empty environment, fixed working directory and fixed command. Write source using file APIs; never interpolate source, filenames or user input into shell commands.
4. Keep expected outputs and checker in the private Judge Worker, outside the contestant sandbox. Feed only the current test input. Compare captured output externally. Run each test in a fresh child process; ensure prior descendants cannot survive to inspect later tests.
5. Do not mount the whole hidden suite or credentials into the sandbox. Input for the currently executing case is necessarily visible to that program; it must not be returned or exfiltrated. The worker-side checker alone decides verdicts.
6. Collect bounded output and independently measured execution status. Reject fake “accepted” text printed by the program; stdout is data.
7. Kill the process tree, destroy the sandbox in a cleanup path, and persist cleanup work if destruction fails. A watchdog reconciles active attempts and orphan leases.

If the chosen SDK/image cannot prevent contestant access to its privileged control service, process supervisor or unrestricted networking, the judge is BLOCKED for untrusted public submissions. Prove these controls in the actual deployed image; do not compensate with a warning or assume separate sessions are isolated.

## Limits and enforcement evidence

| Resource | Default / requirement | Evidence |
|---|---|---|
| CPU | 2 seconds per case; versioned per problem | measured CPU accounting and enforced termination |
| Wall time | 5 seconds per case; 30 seconds suite execution | loop/sleep test, kill all descendants |
| Memory | 256 MiB contestant process group | allocation and child-process test; distinguish infrastructure OOM |
| Output | 64 KiB stdout and 64 KiB stderr per case | terminate on excess without buffering unbounded bytes |
| Processes | Python main process plus minimum required runtime threads; no uncontrolled fork | fork bomb contained by enforceable process limits |
| Files | 16 MiB writable scratch budget; no persistent or shared mounts | disk flood and path traversal test |
| Networking | default deny all contestant egress and ingress | DNS, TCP, UDP, IPv4/IPv6, private/metadata and localhost-control probes |
| Lifetime | hard job timeout 45 seconds after dispatch including startup | cancel, reap and mark infrastructure error |

These are application defaults, not claims that a Cloudflare instance type offers these exact controls. Phase 0 must identify supported OS/runtime enforcement, required privilege separation and headroom for the supervisor. A 256 MiB container cannot necessarily support a 256 MiB contestant plus the SDK. Calibrate CPU under the selected instance class and record its limits. Current SDK lines differ; keep package/image compatible and pin both.

## Verdict taxonomy

`AC` accepted; `WA` wrong answer; `RE` contestant runtime error; `TLE` contestant time exceeded; `MLE` measured contestant memory limit; `OLE` output limit; `INVALID` rejected request; `JUDGE_ERROR` infrastructure failure. Startup errors, platform eviction, network failures and unclassified OOM must not become a player loss. MatchDO handles infrastructure retries/no contest.

Hidden submissions return overall verdict and coarse aggregate runtime/memory only. No hidden test count, index, values, per-case timing or output is exposed. Public runs may return sanitized bounded output. Apply repeated-submit limits to reduce hidden-test probing. Never log hidden input/output or full source in normal telemetry.

## Dispatch and abuse controls

- One pending hidden submission per player; duplicates return the original ID. Up to 20 submissions and 30 public runs per player per match; minimum 2 seconds between new jobs. These are tunable alpha defaults.
- Per-account and IP burst limiting; IP limits allow reasonable shared networks. Enforce centrally at the owning DO, not only in browser buttons.
- Judge coordinator has a configurable max active sandbox count and a bounded pending queue. Use leases with fencing tokens; stale attempts cannot report a current result.
- Backpressure rejects unaccepted work with 429/503 and retry guidance. If work was already durably accepted, it must get a terminal verdict or infrastructure outcome.
- A judge outage closes new matchmaking and reports degraded readiness; active games recover within adjudication bounds or become no contest.

## Security gate

- [ ] Attempt cross-user file/process access and prior-submission residue reads.
- [ ] Attempt reading hidden expected outputs, Worker secrets, SDK tokens and supervisor/control endpoints.
- [ ] Attempt internet, DNS and internal-network exfiltration; verify deny logs and no destination receipt.
- [ ] Test fork, memory, disk and output exhaustion, infinite loops, sleeps and detached children.
- [ ] Submit strings with shell metacharacters and malicious filenames; fixed-command behavior is unchanged.
- [ ] Forge, duplicate and replay verdict callbacks; only current authenticated attempts are applied.
- [ ] Crash/cancel during startup, execution and cleanup; no sandbox remains beyond its cleanup deadline.
- [ ] Security failures stop release even if normal solutions pass.

Run adversarial fixtures only inside the intended isolated judge environment. The automated test harness must never run them as normal host Python programs.
