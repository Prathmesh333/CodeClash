# 09 — Cloudflare staging and production deployment

## Environment isolation

Create separate staging and production Worker names, D1 databases, DO namespaces, judge bindings, secrets and auth callback URLs. Use environment-specific declarations; never assume bindings inherit correctly. The frontend is deployed as Vite-built static assets with same-origin `/api` and WebSocket routing. Ensure SPA fallback cannot intercept API failures or WebSocket upgrades.

Before paid deployment record `<ACCOUNT_ID>`, `<STAGING_DOMAIN>`, `<PRODUCTION_DOMAIN>`, `<D1_DATABASE_IDS>`, `<AUTH_PROVIDER>`, `<MONTHLY_BUDGET_USD>`, `<LOAD_TEST_BUDGET_USD>`, selected region, supported Sandbox instance class and account quotas. These are unresolved inputs. Do not invent IDs or claim free production capacity.

## Configuration requirements

- [ ] Pin Wrangler, Worker compatibility_date, Node, pnpm, Sandbox SDK and matching image.
- [ ] Export MatchmakerDO/MatchDO and configure SQLite DO migrations using current Wrangler schema.
- [ ] Configure D1 binding `DB`, migration directory, private judge service binding and Sandbox/container bindings from the selected official SDK starter.
- [ ] Configure container limits, concurrency cap, job deadlines and explicit cleanup.
- [ ] Declare static asset routing and protect administrative routes.
- [ ] Production startup refuses local auth, fake judge, test seeding and public debug endpoints.
- [ ] Docker/build credentials are available where the container image is built.

Cloudflare's current SDK documentation distinguishes stable and preview APIs; use one compatible line consistently. Deployment may build/push the configured container image through Docker. Follow [Sandbox deployment guidance](https://developers.cloudflare.com/sandbox/guides/deploy/) for the chosen version.

## First staging deployment

From `apps/worker`, illustrative commands after configuration is generated:

```sh
pnpm exec wrangler login
pnpm exec wrangler whoami
pnpm exec wrangler d1 create ranked-dsa-staging
pnpm exec wrangler secret put SESSION_SECRET --env staging
pnpm exec wrangler secret put AUTH_CLIENT_SECRET --env staging
pnpm exec wrangler d1 migrations apply DB --remote --env staging
```

Insert the returned database ID into staging config before applying migrations. Use the generated SDK configuration for the private judge Worker; deploy it first and verify service binding compatibility. From repository root run the implemented wrappers:

```sh
pnpm build
pnpm deploy:judge:staging
pnpm deploy:api:staging
pnpm test:staging
```

Wrappers must target explicit environment/config and print a sanitized target summary before running the appropriate `wrangler deploy --env staging`. Seeds for staging go through a dedicated staging-only procedure, never a public admin shortcut. Verify CLI syntax against the pinned version: [Wrangler commands](https://developers.cloudflare.com/workers/wrangler/commands/).

## Hosted verification

1. Check HTTPS, assets, authentication callback, cookie attributes, API errors and WSS upgrade.
2. Check deployed commit, schema version, rule version, image digest and binding environment all match evidence metadata.
3. Complete two real-account games and verify real sandbox execution, cleanup and D1 settlement.
4. Exercise judge cold start, Worker restart, D1 outage handling, reconnect and rate limits.
5. Confirm staging identities cannot authenticate to production and no resource IDs cross environments.
6. Run the 100-player gate only after smoke/security pass and the spend cap is configured.

## Production promotion

- [ ] Complete document 14; release owner records go/no-go.
- [ ] Take a supported backup/recovery checkpoint and prove restore procedure on staging first.
- [ ] Apply backward-compatible expand migrations; deploy compatible judge and API builds from the tested commit.
- [ ] Keep live-match rule/protocol versions stable. Drain queue before incompatible state/protocol changes.
- [ ] Deploy assets/API with compatible version negotiation and verify health.
- [ ] Open a small closed-alpha cohort at the measured safe concurrency cap, then widen only after healthy metrics.

Production wrappers are `pnpm deploy:judge:production` and `pnpm deploy:api:production`; they require explicit production config and must not seed fake users. Deployment credentials and access are external prerequisites; this pack does not provision them.

## Rollback and restore

Disable new queues, retain active room owners and preserve evidence. Roll back API/assets to a known compatible deployment through verified Wrangler/dashboard procedures; redeploy the recorded judge image digest separately if needed. Code rollback does not roll back D1 migrations, DO storage or active containers automatically. Prefer a forward fix for incompatible data migrations; use expand/contract changes with delayed column removal.

Restore data into an isolated recovery database first, reconcile result digests and rating ledger, then switch bindings during a controlled maintenance window. DOs may still hold post-checkpoint state: fence or drain affected rooms and reconcile their settlement intents before reopening. Record RPO target ≤24 hours for backups and RTO target ≤60 minutes for closed alpha, then measure actual restore time. Never claim these targets were achieved without a drill.
