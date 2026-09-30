# CodeClash

A Python-only 1v1 coding arena built with React/Vite, Cloudflare Workers, Durable Objects and D1. Public examples run on the player’s device using Pyodide/WebAssembly. The private ranked Python judge uses Cloudflare Sandbox/Containers.

## Run locally

Requirements: Node 22.18 or newer and pnpm 11.25.0.

```sh
pnpm install --frozen-lockfile
pnpm db:migrate:local
pnpm db:seed:local
pnpm dev
```

Open http://127.0.0.1:5173. Sign in as two different demo players in separate browser profiles (or one normal window and one private window). Find a match, acknowledge the ready check, and enter the coding room.

Matchmaking, ready checks, WebSockets, forfeit results, ratings, history and rematches run locally. **Run works in the browser without Docker. Ranked Submit stays disabled until the isolated server judge is configured and verified.** The first Run downloads the bundled Python runtime. Demo sign-in is restricted to the local environment.

## Verify changes

```sh
pnpm typecheck
pnpm test:unit
pnpm test:problems
python -m unittest discover -s tests/unit -p "*_test.py"
pnpm test:integration
pnpm test:e2e
pnpm build
```

The Python unit tests mock process creation and never execute contestant code. Integration tests start an isolated local Worker/D1/DO instance. Browser tests rebuild and serve the app on port 8790; Chrome is used locally and Playwright Chromium in CI.

On a Docker host, separately run `pnpm test:judge` and `pnpm test:security`. A successful local test does not certify Cloudflare Sandbox isolation: repeat the security suite on staging before enabling public code execution.

## Project guide

- [Cloudflare staging and GitHub login setup](STAGING.md)

- [Ranked question bank](RANKED_QUESTIONS.md) — 20 original questions and 499 verified cases.

- [Browser Python execution and limits](BROWSER_PYTHON.md)

- [Implementation and remaining work](IMPLEMENTATION_STATUS.md)
- [Review fixes and verification](REVIEW_REPORT.md)
- [Release evidence](RELEASE_EVIDENCE.md)
- [Operational runbooks](RUNBOOKS.md)
- [Original execution brief](Ranked-DSA-Docs/START_HERE.md)
- [Complete requirements](Ranked-DSA-Docs/README.md)

## Release status

Not ready for public deployment. Docker execution, deployed Sandbox isolation, staging credentials, a reviewed problem bank, spend/admission controls and the repeated 100-player capacity gate remain outstanding. No 100-player run has been claimed as passing.

## Share on the same local network

The Vite development server listens on all interfaces. With `pnpm dev` running, other devices on the same Wi-Fi can open `http://<this-computer-LAN-IP>:5173`. The current Wi-Fi address is `192.168.1.46`; DHCP can change it. The API remains on loopback and is forwarded by Vite, including WebSockets. Same-origin LAN demo sign-in is supported; foreign origins remain rejected.

If Windows Firewall blocks access, run this once in an administrator PowerShell:

```powershell
New-NetFirewallRule -DisplayName "CodeClash LAN 5173" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 5173 -RemoteAddress LocalSubnet -Profile Any
```

Choose different demo players on different devices. Keep this PC awake and the development server running. This address is for the local network, not an internet deployment. Browser Python Run works over this LAN HTTP address; ranked Submit still needs the server judge.
