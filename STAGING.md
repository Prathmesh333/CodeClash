# Cloudflare staging

URL: https://code-clash.com

The custom domain is the canonical application address. The underlying Worker remains `ranked-dsa-staging`; the domain does not change the casual-beta release status. Update the GitHub OAuth app homepage and callback to this domain before validating sign-in. Sessions on the previous hostname do not transfer; sign in again.

The staging Worker and its own D1 database were created on 2026-09-30. Both migrations are applied. The database contains 20 questions with 499 distinct example/hidden cases. Demo users were not copied from local development. Ranked judging remains disabled; no Sandbox container was deployed.

## GitHub login

GitHub OAuth is configured. A real sign-in has created one GitHub account and an active session in staging; the hosted account boundary checks passed. Sign-out/re-login and cross-browser persistence still need verification.

For credential rotation or a fresh environment, create a GitHub OAuth app at https://github.com/settings/applications/new:

- Name: CodeClash Staging
- Homepage URL: https://code-clash.com

The custom domain is the canonical application address. The underlying Worker remains `ranked-dsa-staging`; the domain does not change the casual-beta release status. Update the GitHub OAuth app homepage and callback to this domain before validating sign-in. Sessions on the previous hostname do not transfer; sign in again.
- Authorization callback URL: https://code-clash.com

The custom domain is the canonical application address. The underlying Worker remains `ranked-dsa-staging`; the domain does not change the casual-beta release status. Update the GitHub OAuth app homepage and callback to this domain before validating sign-in. Sessions on the previous hostname do not transfer; sign in again./api/auth/github/callback

From the project folder, run:

```powershell
powershell -File scripts/configure-github-staging.ps1
```

Enter the app's Client ID and Client Secret in the local prompt. The secret is hidden, uploaded via standard input to Wrangler, and never written into the repository or a credentials file. Do not paste the secret into chat. The code uses OAuth state validation, single-use state records, PKCE and secure HttpOnly cookies on HTTPS.

Then verify:

```powershell
$env:STAGING_URL = 'https://code-clash.com'
pnpm test:staging:accounts
```

Complete a real GitHub sign-in, sign out, sign in again, and verify the same account on another browser. Until this is done, GitHub end-to-end login is unverified. Unit tests use mocked GitHub responses and do not count as a real login.

## Updates

```sh
pnpm staging:check
pnpm staging:migrate
pnpm staging:seed
pnpm deploy:staging
```

Stop if a command fails. Staging seed inserts questions only; existing questions are preserved. Do not use the local demo-user seeder against cloud data. Configuration is `apps/worker/wrangler.staging.jsonc`; local development remains separate.

Keep the existing `pnpm test:staging` gate strict: it requires a working real judge and must still fail at this account-only stage. `test:staging:accounts` is a separate foundational check, not a ranked release gate.

## Remaining

- Verify sign-out/re-login and cross-browser persistence (initial real login is verified).
- Verify the isolated server judge before enabling ranked queue access.
- Test server verdict races, recovery and hosted execution budgets.
- Add backups/restore verification, abuse controls and spend monitoring before broad access.
- Complete the repeated 100-player gate before claiming multiplayer capacity.

No Workers Paid upgrade or container purchase was requested by this deployment. Cloudflare quotas still apply; this is not a guarantee of zero future charges.

## Verification update — 2026-09-30

- Real GitHub OAuth sign-in persisted an account and active session. Account boundary checks passed.
- All 17 local integration tests passed after correcting a test that treated other tests' active matches as settlement failures. The tested settled match must still have a closed row and exactly one rating update.
- GitHub application job passed on run 36686330244, including browser tests.
- Judge fixtures now override the Sandbox image entrypoint to execute the runner directly.
- The judge image builds Bubblewrap v0.13.0 from pinned revision 52d23329a689f64a8b601f8b999affb69b9339ac, preserving the bounded temporary filesystem option missing in Ubuntu Jammy's package.
- Run 36686701082 builds the image successfully but judge fixtures fail closed: the CI container refuses creation of the required user namespace. No isolation checks were bypassed. Cloudflare judge compatibility remains unverified, and JUDGE_ENABLED remains false.
- Next: validate the judge on an environment supporting its required namespaces, or implement and validate a different server-side isolation backend. Browser WASM execution alone cannot establish trusted ranked verdicts.

## Casual browser beta

Staging uses `CASUAL_WASM=true`. Matchmaking creates `casual` rooms, including rematches. Python executes using the existing browser WASM runtime. Check & finish reruns the public examples; after they pass the browser reports completion to `/api/match/:id/claim`.

These are unverified self-reported results, not proof of a correct solution. Users can bypass browser checks. The server permits this endpoint only for casual rooms, checks membership and match phase, records one immutable result, and never changes ranked ratings or statistics. Public examples stay public; private judge cases are not sent to the browser. History includes casual results. Concurrent reports are ordered by the room, not client runtime measurements.

`JUDGE_ENABLED=false` remains in force. Existing ranked rooms reject browser claims. This beta does not satisfy the real-judge or repeated 100-player release gate. No paid container was deployed. Browser workers do not provide physical CPU-core allocation guarantees.

Validation: `pnpm test:integration`; for the dedicated browser test set `CASUAL_E2E=true` and run `pnpm exec playwright test casual.spec.ts`. Normal browser tests leave that flag unset.
