# Google and email sign-in

GitHub remains available. Google and email sign-in are shown as coming soon until their server credentials are configured. Provider buttons become available through `/api/health` after both required settings exist. Real provider sign-in and email delivery still require hosted verification.

## Google

1. Open [Google Auth Platform](https://console.cloud.google.com/auth/overview) in your Google Cloud project.
2. Configure the app branding and audience for CodeClash. Use `code-clash.com` as the authorized domain. Add test users if the app is in testing mode.
3. Create a **Web application** OAuth client. Homepage: `https://code-clash.com`. Authorized JavaScript origin: `https://code-clash.com`. Authorized redirect URI: `https://code-clash.com/api/auth/google/callback`.
4. Upload credentials through the local secure prompt:

```powershell
cd 'D:\!_Projects\RankedDSA'
powershell -File scripts/configure-login-staging.ps1 -Provider google
```

The server requests only `openid profile email`, uses state and PKCE, exchanges the code server-side, and reads the verified profile from Google’s UserInfo endpoint. Tokens are not persisted. Account IDs use the stable Google subject, not the email address.

Reference: [Google OpenID Connect documentation](https://developers.google.com/identity/openid-connect/openid-connect).

## Email links

1. Create a [Resend account](https://resend.com/) and verify a sending domain such as `auth.code-clash.com` using its prescribed DNS records. Keep the root domain’s incoming email routing records intact.
2. Choose a sender such as `CodeClash <login@auth.code-clash.com>` and create a sending API key scoped to that domain.
3. Upload the sender and API key:

```powershell
cd 'D:\!_Projects\RankedDSA'
powershell -File scripts/configure-login-staging.ps1 -Provider email
```

Do not paste secrets into chat or commit them. The setup script passes them directly to Wrangler without creating a secret file. Review the sending service’s current plan and limits before activation; the application caps sign-in sends at 100 per day, three per address per hour, and ten per IP per hour.

Links expire after ten minutes, are stored as hashes, require the requesting browser, and are consumed atomically by a confirmation POST. Opening a link via GET does not sign in or consume it, protecting against email scanners. Request another link if expired. Email addresses are stored privately with pending links; expired records are cleaned on subsequent requests. Email account IDs are hashes and public usernames do not reveal the address.

Reference: [Resend send-email API](https://resend.com/docs/api-reference/emails/send-email).

## Account behavior and verification

Each provider creates a separate identity. Matching email addresses do not automatically merge Google, email, or GitHub accounts. Account linking requires a future explicit authenticated flow.

After configuration, verify:

- Google sign-in, sign-out, and repeat sign-in retain one account and history.
- Email delivery to a real inbox; confirmation creates a session.
- Link replay, expired links, and a different browser fail without signing in.
- Existing GitHub login still works.
- Provider errors and send failures leave users signed out.

Credentials alone do not establish that these hosted checks passed.
