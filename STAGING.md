# Cloudflare staging

URL: https://ranked-dsa-staging.shortlistd.workers.dev

The staging Worker and its own D1 database were created on 2026-09-30. Both migrations are applied. The database contains 20 questions with 499 distinct example/hidden cases. Demo users were not copied from local development. Ranked judging remains disabled; no Sandbox container was deployed.

## Finish GitHub login

Create a GitHub OAuth app at https://github.com/settings/applications/new:

- Name: CodeClash Staging
- Homepage URL: https://ranked-dsa-staging.shortlistd.workers.dev
- Authorization callback URL: https://ranked-dsa-staging.shortlistd.workers.dev/api/auth/github/callback

From the project folder, run:

```powershell
powershell -File scripts/configure-github-staging.ps1
```

Enter the app's Client ID and Client Secret in the local prompt. The secret is hidden, uploaded via standard input to Wrangler, and never written into the repository or a credentials file. Do not paste the secret into chat. The code uses OAuth state validation, single-use state records, PKCE and secure HttpOnly cookies on HTTPS.

Then verify:

```powershell
$env:STAGING_URL = 'https://ranked-dsa-staging.shortlistd.workers.dev'
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

- Configure GitHub OAuth credentials and verify real login and persistent identity.
- Verify the isolated server judge before enabling ranked queue access.
- Test server verdict races, recovery and hosted execution budgets.
- Add backups/restore verification, abuse controls and spend monitoring before broad access.
- Complete the repeated 100-player gate before claiming multiplayer capacity.

No Workers Paid upgrade or container purchase was requested by this deployment. Cloudflare quotas still apply; this is not a guarantee of zero future charges.
