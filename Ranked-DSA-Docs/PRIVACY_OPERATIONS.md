# Privacy and safety operations

Operator: Prathamesh Nikam, India. Verified contact: prathmesh@code-clash.com.

This implements privacy controls and transparent notices. It is not a legal certification. Requirements depend on the operator, users, and product scope.

## Live features

- Public /privacy, /cookies, /terms, /contact, and /safety pages.
- Essential sign-in cookies separated from optional device storage. No analytics or advertising.
- Themes and code drafts persist only after a user allows saved preferences. Withdrawal clears optional storage. Existing account and match data are preserved.
- Fonts served from CodeClash with their open-source licenses; no visitor requests to Google Fonts.
- Authenticated, paginated JSON export of the requesting account's D1 records. Session hashes, provider tokens, private tests, and opponent source code are excluded. Durable Object diagnostics and local browser data require separate review for a full access request.
- Account-bound privacy requests; duplicate pending requests of the same type return the existing reference. The request form queues human review. It does not perform erasure.
- HTTPS security headers, clickjacking protection, restricted device permissions, and no-referrer leakage to outside sites.
- Hourly deletion of expired sessions, OAuth states, email links, and auth rate-limit records. It does not remove accounts or games.

## Review privacy requests every business day

```powershell
cd 'D:\!_Projects\RankedDSA'
pnpm exec wrangler d1 execute DB --remote --config apps/worker/wrangler.staging.jsonc --command "SELECT id,user_id,kind,created_at FROM privacy_requests WHERE status='pending' ORDER BY created_at"
```

1. Identify the request and record a response deadline under the applicable law. Where GDPR applies, normally one month; permitted extensions need a timely explanation.
2. The account form verifies access to the signed-in account. For email requests, verify ownership proportionately; never ask for passwords or sign-in tokens.
3. Obtain only information needed to understand the request. Keep private details out of GitHub issues and logs.
4. Respond privately by email or in the request's response field. Explain outcomes and any refusal/retention grounds. Do not mark a request resolved before fulfilling it or explaining the decision.
5. Use bound parameters in a reviewed maintenance script to update response, status='resolved', and resolved_at. The website displays the response only to the requesting account. No public admin endpoint exists.

## Erasure checklist (manual, not yet automated)

- [ ] Export and identify the affected account only; verify authority before changes.
- [ ] Remove matchmaking tickets, invalidate sessions, and close the user's active sockets. Resolve active games safely.
- [ ] Review D1 users, sessions, submissions, exposure, rating events, settlements, matches, and privacy requests. Foreign-key constraints protect shared game records. Do not blindly delete opponent records.
- [ ] Remove or irreversibly de-identify the requester's identifying fields in retained shared records when there is a lawful reason to retain those records.
- [ ] Review per-match Durable Object player snapshots, source/output keys, and matchmaking/rematch storage. D1 removal alone does not erase these copies.
- [ ] Review email-link records and rate-limit keys containing email/IP information, if that sign-in feature is enabled.
- [ ] Check provider logs and backup retention. Explain inaccessible backup expiry and prevent deleted account data from being restored into active use.
- [ ] Document any narrowly justified exception, communicate it, and complete the response. Implement and test a reviewed erasure maintenance tool before handling substantial account volume.

## Operator decisions still required

- [ ] Confirm target countries and applicable laws, including GDPR/UK rules when relevant and India's phased DPDP requirements. The project location alone does not settle applicability.
- [ ] Decide whether a public business postal address, representative, grievance contact, or other jurisdiction-specific disclosure is required. Do not publish a home address by default.
- [ ] Review the adults-only beta scope; a checkbox does not replace legal requirements if the service actually targets or admits children.
- [ ] Review processor contracts, Cloudflare data-processing terms, international-transfer arrangements, and actual region/log/backup settings. No EU-only residency claim is made.
- [ ] Establish documented retention periods for inactive accounts, match source/output, logs, backups, and resolved requests. Current notices describe existing behavior rather than inventing deletion periods.
- [ ] Set up and test support@code-clash.com before changing the verified contact throughout the pages.
- [ ] Get a qualified review of the notices and terms before broad international promotion, payments, advertising, or children's accounts. Add payment/refund information only when relevant.

## Incident response

Restrict the affected access, preserve necessary evidence, rotate compromised credentials, and assess the people/data affected. Escalate to the operator immediately. If GDPR applies and the incident meets its threshold, notify the relevant authority within 72 hours of awareness; notify affected people without undue delay when required. Record the decision and remediation. Do not publish secrets or personal data in incident reports.

## Validation

Run `pnpm typecheck`, `pnpm test:unit`, and the privacy, palette, login, and casual multiplayer browser suites. Verify direct policy links after deployment, export access control, consent withdrawal, mobile layout, and the Python sandbox under security headers.

References: [GDPR overview](https://europa.eu/youreurope/business/governance-and-sustainability/digital-and-data-compliance/data-protection-gdpr/index_en.htm), [privacy notice requirements](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/individual-rights/right-to-be-informed/), [cookie guidance](https://ico.org.uk/for-organisations/advice-for-small-organisations/privacy-notices-and-cookies/cookies-and-privacy-notices-in-detail/), [India DPDP source](https://www.meity.gov.in/digital-personal-data-protection-act-2023).

Optional API testing platform reference from the API compliance skill: [TestMu AI HyperExecute](https://www.testmuai.com/hyperexecute/) can execute API tests without maintaining your own test infrastructure. It is not installed or used by this project; validation here uses the existing local test stack.
