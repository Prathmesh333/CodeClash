import { clearDrafts } from './storage';
import { useEffect, useState, type ReactNode } from 'react';
import SiteFooter from './SiteFooter';
import { api } from './api';
import type { User } from '../../../packages/shared/game';
export const legalPaths = ['/privacy', '/cookies', '/terms', '/contact', '/safety'];
const contact = 'prathmesh@code-clash.com';
const email = <a href={`mailto:${contact}`}>{contact}</a>;
const titles: Record<string, string> = {
  '/privacy': 'Privacy notice',
  '/cookies': 'Cookies and device storage',
  '/terms': 'Terms of use',
  '/contact': 'Contact and privacy requests',
  '/safety': 'Safety and fair play',
};
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  );
}
export default function LegalPage() {
  const path = location.pathname;
  useEffect(() => {
    document.title = `${titles[path]} | CodeClash`;
  }, [path]);
  return (
    <>
      <header className="legal-header">
        <a href="/" aria-label="CodeClash home">
          CodeClash
        </a>
        <a href="/">Back to the arena</a>
      </header>
      <main id="main" className="legal-page">
        <h1>{titles[path]}</h1>
        <p className="legal-date">Updated 8 October 2026</p>
        {path === '/privacy' && (
          <>
            <p>
              CodeClash is a live coding duel platform operated by Prathamesh Nikam in India. For
              questions about your personal data, contact {email} or use the{' '}
              <a href="/contact">privacy request form</a>.
            </p>
            <Section title="What we collect">
              <ul>
                <li>
                  Account information: an account identifier from your chosen sign-in provider, your
                  username, optional bio, avatar color, and account creation date.
                </li>
                <li>
                  Match information: opponents, problem assignments, timing, outcomes, rating
                  records, and submissions when server judging is enabled.
                </li>
                <li>
                  Privacy requests: the type of request, your message, account identifier,
                  timestamps, and handling status.
                </li>
                <li>
                  Technical information: our hosting provider processes connection details such as
                  IP address and request metadata to deliver and protect the service. Application
                  errors record a request identifier, endpoint path, and error type.
                </li>
              </ul>
              <p>
                Google sign-in checks a verified email and reads profile information to establish
                your account. We retain the provider identifier and initial display name, not Google
                passwords or access tokens. GitHub sign-in reads your public account profile. If
                email sign-in is enabled, we process your email address and temporary sign-in
                records. It is currently disabled.
              </p>
            </Section>
            <Section title="Why we use it">
              <p>
                We use account and match information to provide sign-in, matchmaking, saved history,
                and competition results. Where GDPR applies, this processing supports the service
                you request under our terms. We use limited security and operational information for
                our legitimate interests in preventing abuse and maintaining reliability. Optional
                device storage relies on your choice in Cookie settings.
              </p>
              <p>
                We do not sell personal data or use it for advertising. There are no analytics
                trackers or marketing mail subscriptions in this release. We do not send your code
                to an AI provider.
              </p>
            </Section>
            <Section title="What other players can see">
              <p>
                Your username, avatar color, rating, and statistics may appear in matches and the
                public leaderboard. Match participants can see their shared result. Your bio is
                currently shown in your own profile editor. Local Python code drafts and browser
                execution output stay on your device unless you deliberately send them to a server
                feature.
              </p>
            </Section>
            <Section title="Services we use">
              <p>
                Cloudflare hosts the website, API, database, and multiplayer rooms. Google and
                GitHub handle sign-in when you choose them. If email sign-in is enabled, Resend
                delivers sign-in messages. Follow their privacy notices for their own processing:{' '}
                <a href="https://www.cloudflare.com/privacypolicy/">Cloudflare</a>,{' '}
                <a href="https://policies.google.com/privacy">Google</a>,{' '}
                <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement">
                  GitHub
                </a>
                , and <a href="https://resend.com/legal/privacy-policy">Resend</a>.
              </p>
              <p>
                These providers may process information outside your country, including outside the
                EEA or UK. We have not restricted the service to EU-only infrastructure. Contact us
                for information about applicable provider agreements and transfer safeguards.
              </p>
            </Section>
            <Section title="How long information stays">
              <p>
                Account profiles and match records currently remain while the account is active;
                there is no automatic inactivity deletion. An erasure request starts a review of
                account, database, multiplayer-room, and backup records, including records shared
                with opponents. We explain any legal or dispute-related reason to retain information
                rather than promising immediate removal from every system.
              </p>
              <p>
                Sign-in sessions expire after seven days; OAuth and email-link records expire after
                ten minutes. Expiry prevents further use. Hourly maintenance removes expired sign-in
                and rate-limit records; delays are possible during outages. Host log and backup
                retention follows the configured Cloudflare service settings. Contact us for the
                current settings. Code drafts remain on the device until cleared or optional storage
                is disabled. Privacy requests remain until handled and retention is reviewed.
              </p>
            </Section>
            <Section title="Your choices and rights">
              <p>
                Edit your username and bio in Profile. Use Cookie settings to allow or withdraw
                saved preferences, or clear local drafts below. Signed-in users can download their
                account records and submit requests for access, correction, erasure, restriction, or
                objection on our <a href="/contact">contact page</a>.
              </p>
              <p>
                Where GDPR applies, you can exercise these rights, request portability where
                applicable, and complain to your local data protection authority. We aim to respond
                within one month, subject to applicable law and permitted extensions. We may need to
                verify identity. We never need your password for a request.
              </p>
            </Section>
            <Section title="Children and changes">
              <p>
                This beta is intended for adults aged 18 and over. Please contact us if a child has
                created an account. We will update this notice when our data practices change and
                provide notice of material changes through the service.
              </p>
            </Section>
          </>
        )}
        {path === '/cookies' && (
          <>
            <p>
              Cookies are small browser records. Local storage saves information on your device
              across visits; session storage lasts for the browser tab. We use essential sign-in
              storage and offer an optional setting for saved themes and drafts. No analytics or
              advertising trackers are installed.
            </p>
            <Section title="Essential sign-in and match storage">
              <div className="legal-table">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Purpose</th>
                      <th>Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>rdsa_session</td>
                      <td>Keep you signed in; HttpOnly and Secure on HTTPS</td>
                      <td>7 days</td>
                    </tr>
                    <tr>
                      <td>rdsa_oauth / rdsa_pkce</td>
                      <td>Protect GitHub sign-in</td>
                      <td>10 minutes</td>
                    </tr>
                    <tr>
                      <td>rdsa_google_oauth / rdsa_google_pkce</td>
                      <td>Protect Google sign-in</td>
                      <td>10 minutes</td>
                    </tr>
                    <tr>
                      <td>cc_email_browser</td>
                      <td>Bind an email link to the requesting browser, if enabled</td>
                      <td>10 minutes</td>
                    </tr>
                    <tr>
                      <td>matchId (session storage)</td>
                      <td>Restore your match in the current tab</td>
                      <td>Until the tab closes or match is cleared</td>
                    </tr>
                    <tr>
                      <td>codeclash:storage-choice</td>
                      <td>Remember your storage choice</td>
                      <td>Until you change it or clear browser data</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p>
                These support a service you request or remember your privacy choice. Blocking
                sign-in cookies prevents account access. Your sign-in provider may use its own
                cookies when you visit its login page.
              </p>
            </Section>
            <Section title="Optional saved preferences">
              <div className="legal-table">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Purpose</th>
                      <th>Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>codeclash:theme</td>
                      <td>Remember your selected palette</td>
                      <td>Until removed</td>
                    </tr>
                    <tr>
                      <td>rdsa:account:match</td>
                      <td>Save your code draft for that account and match</td>
                      <td>Until removed or sign-out</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p>
                These are written only after you choose Allow saved preferences. Essential only
                removes saved themes and drafts and prevents further saves. Changing this choice
                does not remove your server account or history. Standard browser caching may store
                website assets and the Python runtime.
              </p>
            </Section>
            <PrivacyTools signedInRequired={false} />
          </>
        )}
        {path === '/terms' && (
          <>
            <p>
              These terms govern CodeClash, operated by Prathamesh Nikam in India. Contact {email}{' '}
              with questions. By signing in and using the service, you agree to these terms. Please
              read the <a href="/privacy">Privacy notice</a> separately.
            </p>
            <Section title="Accounts and eligibility">
              <p>
                You must be at least 18 to use this beta. Keep your sign-in account secure and use a
                username that does not impersonate others. Each account can claim one available
                username. Report unauthorized access promptly.
              </p>
            </Section>
            <Section title="Competition and acceptable use">
              <p>
                Do not cheat, manipulate results, harass players, exploit vulnerabilities, overload
                the service, or attempt to access another person's account or private data. In
                competitive matches, solve independently without outside AI assistance. Do not
                submit code intended to attack the app, other users, or infrastructure.
              </p>
              <p>
                We may restrict an account when needed to investigate abuse or protect players.
                Contact us to explain your case or challenge a restriction.
              </p>
            </Section>
            <Section title="Your code and profile">
              <p>
                You retain rights to your own code. You permit CodeClash to process it as needed to
                run the features you use and display your chosen public profile information. Do not
                upload confidential information, credentials, or material you do not have permission
                to use.
              </p>
            </Section>
            <Section title="The current beta">
              <p>
                CodeClash is currently a free casual Python beta. Browser-reported completion is
                unverified and does not change ratings. Verified ranked judging and tournaments are
                not yet available. Ratings, prizes, uninterrupted availability, and perfect judging
                are not guaranteed.
              </p>
            </Section>
            <Section title="Problems, responsibility, and ending use">
              <p>
                Report incorrect problems, lost progress, and security issues through{' '}
                <a href="/contact">Contact</a>. You may stop using CodeClash at any time and request
                account erasure. Nothing in these terms excludes rights or liability that applicable
                law does not allow us to exclude.
              </p>
              <p>
                We may change or discontinue beta features. Material changes to these terms will be
                communicated through the service. Paid features will require separate pricing and
                purchase information before launch.
              </p>
            </Section>
          </>
        )}
        {path === '/contact' && (
          <>
            <p>
              CodeClash is operated by Prathamesh Nikam in India. Email {email} for support or
              private security reports. Never include passwords, sign-in links, API keys, or other
              secrets.
            </p>
            <p>
              For reproducible bugs without personal data, you can also use{' '}
              <a href="https://github.com/Prathmesh333/CodeClash/issues">GitHub issues</a>. GitHub
              issues are public.
            </p>
            <PrivacyTools signedInRequired />
          </>
        )}
        {path === '/safety' && (
          <>
            <Section title="Keep your account and code safe">
              <p>
                Use a secure Google or GitHub account. Sign out on shared devices and clear saved
                drafts. Do not put passwords or API keys in code or profile text. Python executes in
                a browser sandbox, but deliberate malicious code and attempts to escape that sandbox
                are prohibited.
              </p>
            </Section>
            <Section title="Fair play">
              <p>
                Work independently in competitive matches. Casual results are browser-reported,
                unverified, and unrated. Do not treat them as proof of skill or verified code
                correctness.
              </p>
            </Section>
            <Section title="Report a problem privately">
              <p>
                Email {email} for account abuse, unsafe content, or a security vulnerability.
                Include what happened and enough steps to reproduce it without exposing someone
                else's data. Please do not test against other users or publish secrets in an issue.
              </p>
            </Section>
            <Section title="Accessibility">
              <p>
                The interface supports keyboard navigation, visible focus, mobile layouts, and
                reduced motion. If a feature prevents you from using the site, send us the page and
                a description of the barrier. We will review it with the same care as other product
                bugs.
              </p>
            </Section>
          </>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
function PrivacyTools({ signedInRequired }: { signedInRequired: boolean }) {
  const [user, setUser] = useState<User | null>(null),
    [kind, setKind] = useState('erasure'),
    [message, setMessage] = useState(''),
    [status, setStatus] = useState(''),
    [busy, setBusy] = useState(false),
    [requests, setRequests] = useState<
      { id: string; kind: string; status: string; response?: string }[]
    >([]);
  useEffect(() => {
    if (signedInRequired)
      void api<{ user: User | null }>('/me')
        .then(async ({ user }) => {
          setUser(user);
          if (user)
            setRequests((await api<{ requests: typeof requests }>('/privacy/requests')).requests);
        })
        .catch((e) => setStatus(e.message));
  }, [signedInRequired]);
  async function download() {
    setBusy(true);
    setStatus('');
    try {
      let offset = 0;
      const collected: Record<string, unknown[]> = {};
      let profile: unknown;
      do {
        const page = await api<{
          profile: unknown;
          collections: Record<string, unknown[]>;
          nextOffset: number | null;
        }>(`/privacy/export?offset=${offset}`);
        profile = page.profile;
        for (const [key, rows] of Object.entries(page.collections))
          collected[key] = [...(collected[key] ?? []), ...rows];
        if (page.nextOffset === null) break;
        offset = page.nextOffset;
      } while (true);
      const blob = new Blob(
        [JSON.stringify({ exportedAt: new Date().toISOString(), profile, ...collected }, null, 2)],
        { type: 'application/json' },
      );
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = 'codeclash-account-data.json';
      a.click();
      setTimeout(() => URL.revokeObjectURL(href), 1000);
      setStatus(
        'Your export includes server account records. Drafts saved on this device are separate.',
      );
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Export failed. Try again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Section title={signedInRequired ? 'Your data, under your control' : 'Clear local drafts'}>
      <p>
        You can remove saved code from this device without deleting your account or match history.
      </p>
      <button
        className="button secondary"
        onClick={() => {
          clearDrafts();
          setStatus('Saved code drafts cleared from this device.');
        }}
      >
        Clear saved drafts
      </button>
      {signedInRequired &&
        (user ? (
          <>
            <hr />
            <button className="button secondary" onClick={() => void download()} disabled={busy}>
              Download my data
            </button>
            <p>
              For erasure or another privacy right, submit a request below. This queues a review; it
              does not delete your account immediately. We aim to respond within one month, subject
              to applicable law.
            </p>
            <form
              className="privacy-form"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                setStatus('');
                try {
                  const result = await api<{
                    request: { id: string; kind: string; status: string };
                  }>('/privacy/requests', { kind, message });
                  setRequests(
                    (await api<{ requests: typeof requests }>('/privacy/requests')).requests,
                  );
                  setStatus(`Request received. Reference: ${result.request.id}`);
                  setMessage('');
                } catch (e) {
                  setStatus(e instanceof Error ? e.message : 'Request failed. Try again.');
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label htmlFor="privacy-kind">Request type</label>
              <select id="privacy-kind" value={kind} onChange={(e) => setKind(e.target.value)}>
                <option value="erasure">Delete my account and personal data</option>
                <option value="access">Access my data</option>
                <option value="correction">Correct my data</option>
                <option value="objection">Object to processing</option>
                <option value="restriction">Restrict processing</option>
                <option value="other">Another privacy question</option>
              </select>
              <label htmlFor="privacy-message">Details (optional)</label>
              <textarea
                id="privacy-message"
                maxLength={1000}
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <button className="button primary" disabled={busy}>
                Submit privacy request
              </button>
            </form>
            {requests.length > 0 && (
              <>
                <h3>Your requests</h3>
                <ul>
                  {requests.map((r) => (
                    <li key={r.id}>
                      {r.kind}: {r.status} <small>({r.id})</small>
                      {r.response && <p>{r.response}</p>}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        ) : (
          <p>
            <a href="/">Sign in from the arena</a> to download account data or submit a verified
            privacy request. You can also email {email}.
          </p>
        ))}
      {status && <p role="status">{status}</p>}
    </Section>
  );
}
