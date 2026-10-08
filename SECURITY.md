# Security review and reporting

Report vulnerabilities privately to [prathmesh@code-clash.com](mailto:prathmesh@code-clash.com). Include the affected route, reproduction steps, and likely impact. Do not include session cookies, OAuth secrets, or another person's private data in a public issue.

## Review: 8 October 2026

Reviewed the Worker entry points, OAuth and email authentication, profiles, privacy exports, match ownership, WebSocket sessions, matchmaking, the browser Python runner, deployment configuration, and installed dependencies. This is a source review with local security regression tests; it is not a certification or a guarantee that every vulnerability has been found.

### Findings addressed

| Issue | Impact | Fix |
| --- | --- | --- |
| 14 dependency advisories | Four high, five moderate, five low advisories; DOMPurify is bundled in the editor, the others affect tooling | Pin patched DOMPurify 3.4.16, Undici 7.29.1, source-map-js 1.2.2, and sharp 0.35.5; audit dependencies in CI |
| Incomplete app CSP | No script policy to contain injected JavaScript | Restrict scripts to local assets and a unique per-response nonce; deny inline event handlers, external connections, objects and framing |
| Email page headers overwritten | Removed its default-deny CSP and no-referrer policy | Preserve route-specific headers, including token-bearing email verification pages |
| Unlimited OAuth initiation | Unauthenticated requests could accumulate state records | Atomic limits: 20 initiations per IP and 600 globally per ten-minute bucket, across providers |
| Unlimited sensitive requests | Automated writes and socket reconnections could consume storage and service work | Atomic shared limit of 60 writes/upgrades per account per minute |
| Unlimited socket messages | Small valid heartbeat floods triggered repeated D1 and room work | Limit to 12 messages per ten seconds and 1 KiB per frame before database work |
| Unbounded queue work and records | Frequent polls could repeatedly scan the queue; a growing ticket record could exceed storage limits | Bound status polling to 60/minute per account, admission to 200 tickets and 96 KB; cap transient admission memory |
| Primitive JSON bodies | Arrays/null/scalars could produce 500 errors | Require JSON objects and retain streamed byte limits; return 400/413 |
| Outbound authentication calls without deadlines | A stalled identity/email service held the request open | Ten-second timeouts for OAuth exchanges, profile fetches and email delivery |
| Auth-dependent HTML and redirects could be cached | Cached routing decisions could outlive a session change | `Cache-Control: no-store` on HTML, API responses and redirects |

The polling limiter lives in the single matchmaker object's memory and resets on eviction. It reduces repeated scanning; it is not a replacement for Cloudflare edge flood protection. Atomic authentication/write counters persist in D1 and their expired buckets are removed by the existing hourly cleanup.

### Existing boundaries checked

- Session tokens are random, hashed in D1, expire, and use HttpOnly/SameSite cookies; HTTPS cookies use Secure.
- OAuth state is browser-bound and consumed once. Both providers use PKCE.
- Google identities must have verified email. Providers use separate identity namespaces.
- Email links are hashed, browser-bound, expire after ten minutes, and are consumed only by POST.
- Mutations and socket upgrades require the configured Origin. Demo authentication requires both a local environment and a loopback hostname.
- Match participants are checked server-side. Client `X-Player` headers are replaced with the authenticated identity.
- Match snapshots exclude hidden tests and other players' source code. Privacy exports are scoped to the requesting user and omit session secrets.
- The Python iframe has an opaque origin, no same-origin sandbox permission, and a separate restrictive CSP. Each run gets a disposable worker and filesystem, a five-second execution timeout, and a 16 KiB output limit.
- Browser completion can settle only unverified, unrated casual matches. It cannot create verified ranked wins.
- The server judge remains disabled; the judge Worker has no public route and refuses execution until its isolation gate is enabled.
- No account data or schema was deleted as part of these fixes.

### Validation and remaining gates

Run:

```sh
pnpm typecheck
pnpm test:unit
pnpm audit --audit-level low
pnpm test:integration
pnpm exec playwright test tests/e2e/security.spec.ts tests/e2e/arena.spec.ts tests/e2e/privacy.spec.ts
```

Regressions cover concurrent rate-limit admission, primitive/oversized bodies, private document caching, unique CSP nonces, preserved email headers, forged identities, cross-origin mutations, room ownership, socket flooding and revocation, and queue bounds. Browser checks exercise inline-script rejection, account isolation, and actual Python execution under the CSP.

Local results: TypeScript passed; 55 unit checks passed; all 18 integration cases passed across the suite run and a corrected leaderboard fixture rerun; the dependency audit reported zero known advisories. Browser checks passed for authentication, anonymous route protection, expired sessions, privacy, script injection rejection, Python limits/isolation, reconnection, forfeits and rematches.

Remaining release requirements:

- Any OAuth secret exposed outside secret storage must be rotated at its provider and in Cloudflare. A source scan cannot establish that rotation happened.
- Reauthenticate Wrangler before publishing if Cloudflare rejects the saved credentials. Local verification does not prove the deployed site contains these fixes.
- Browser WASM does not offer a reliable hard RAM or CPU-core quota. A player's own excessive allocation can still crash their tab; browser results remain untrusted.
- Verified ranked execution still needs the separate container isolation/security gate. Do not enable it based on these browser tests.
- The **100-fake-player repeated simulation gate** remains required before claiming ranked capacity. The existing real-judge simulation refuses a disabled judge. This review does not count unit fixtures or casual reports as a passing real-judge gate.
- The current queue is one bounded object. Higher capacity needs sharding and measured load tests.
- This review does not include an intrusive scan against live users, Cloudflare account administration, or an independent penetration test.

References: [OWASP WebSocket security guidance](https://cheatsheetseries.owasp.org/cheatsheets/WebSocket_Security_Cheat_Sheet.html), [MDN CSP guidance](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP).

Optional API security testing can also be run on TestMu AI HyperExecute; this review used the repository's local test tools.
