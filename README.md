# CodeClash

**One problem. Two programmers. A live coding duel.**

CodeClash is a multiplayer coding arena where two players receive the same algorithm problem, write Python against a shared clock, and compete to finish. It brings the focus of solving a programming challenge into a real-time, head-to-head match.

[Try the live demo](https://code-clash.com/) · [GitHub repository](https://github.com/Prathmesh333/CodeClash) · [Report an issue](https://github.com/Prathmesh333/CodeClash/issues) · [Development guide](DEVELOPMENT.md)

## The match experience

1. **Sign in with GitHub** and join the matchmaking queue.
2. **Meet your opponent.** Both players confirm they are ready before the countdown begins.
3. **Solve the same problem.** Write Python in the editor and run the public examples on your device.
4. **Finish the duel.** In the current casual beta, passing the examples lets you report completion. The first completion received by the server ends the match.
5. **Revisit the result** in match history or queue for another opponent.

The clock and match state are shared through WebSockets. Players can reconnect to an existing match or forfeit if they need to leave.

## Available today

- **Live 1v1 matches** with matchmaking, ready checks, a synchronized countdown, and a shared 20-minute clock.
- **Python coding workspace** with a Monaco editor, locally saved drafts, example checks, and execution cancellation.
- **Browser Python execution** powered by Pyodide and WebAssembly, keeping public example runs on the player’s device.
- **20 original algorithm problems** covering easy and medium challenges. Hidden tests and reference solutions stay out of the browser.
- **GitHub sign-in and saved match history**, backed by Cloudflare D1.
- **11 selectable color themes**, including light and dark palettes, with a saved device preference and an editor that follows the selected theme.
- **Responsive layouts and reduced-motion support** for desktop and mobile browsers.

## Current stage: casual beta

The [live demo](https://code-clash.com/) runs on Cloudflare staging. Matches use **browser-reported, unverified results** and **do not change ratings**. Passing public examples does not prove a solution passes hidden tests.

Verified ranked judging is implemented in part but remains disabled pending server isolation and security validation. The ranked leaderboard will reflect verified results when that mode is enabled. Tournaments are planned for a future release.

The repeated **100-fake-player simulation gate** and gameplay fairness checks remain outstanding. The beta is not a claim of production capacity or ranked competitive fairness.

## How it is built

| Layer | Technology | Role |
| --- | --- | --- |
| Interface | React, Vite, TypeScript | Homepage, match room, editor, themes, history |
| API | Cloudflare Workers | Authentication and application routes |
| Multiplayer | Cloudflare Durable Objects + WebSockets | Matchmaking and authoritative per-match state |
| Persistence | Cloudflare D1 | Accounts, problems, matches, results |
| Browser execution | Pyodide / WebAssembly | Python runs against public examples on the player’s device |
| Planned verified judge | Cloudflare Sandbox / Containers | Isolated server execution against hidden tests; currently disabled |

Cloudflare coordinates matches and stores results. The player’s browser handles public Python example runs. This keeps the casual beta lightweight while leaving a separate path for trusted ranked judging.

## Project documentation

- [Development guide](DEVELOPMENT.md) — local setup, verification commands, and LAN access.
- [Cloudflare staging and GitHub login](STAGING.md) — deployment and authentication configuration.
- [Problem bank](RANKED_QUESTIONS.md) — question format, test cases, and selection rules.
- [Browser Python execution](BROWSER_PYTHON.md) — runtime, isolation boundaries, and limits.
- [Release evidence](RELEASE_EVIDENCE.md) — release gates and recorded verification.
- [Operational runbooks](RUNBOOKS.md) — recovery and operational procedures.
- [Full project documentation](Ranked-DSA-Docs/README.md) — architecture, testing, deployment, capacity, fairness, and roadmap.
- [Execution brief](Ranked-DSA-Docs/START_HERE.md) — implementation requirements and acceptance gates.

CodeClash began as **Ranked DSA**; some infrastructure names and original documentation retain that name.

## Contributing

See the [development guide](DEVELOPMENT.md) to run the project and verify changes. Report bugs and suggest improvements through [GitHub issues](https://github.com/Prathmesh333/CodeClash/issues). Include the steps to reproduce a bug, the browser used, and the expected behavior.
