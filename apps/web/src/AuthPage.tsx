import AuthOptions from './AuthOptions';
import ThemePicker from './ThemePicker';
import SiteFooter from './SiteFooter';
import { useTheme } from './themes';

type Props = {
  loading: boolean;
  error: string;
  busy: boolean;
  health: { local: boolean; github?: boolean; google?: boolean; email?: boolean } | null;
  choose: (id: string) => void;
};

export default function AuthPage({ loading, error, health, busy, choose }: Props) {
  const theme = useTheme();
  const registering = location.pathname === '/register';
  return (
    <div className="auth-page">
      <a className="skip-link" href="#access">
        Skip to sign in
      </a>
      <header className="auth-header">
        <a href="/" aria-label="CodeClash home">
          <img
            width="190"
            height="42"
            src={`/brand/logo/codeclash-wordmark${theme.mode === 'dark' ? '-dark' : ''}.svg`}
            alt="CodeClash"
          />
        </a>
        <div>
          <ThemePicker />
        </div>
      </header>
      <main className="auth-layout">
        <section className="auth-hero" aria-labelledby="auth-title">
          <h1 id="auth-title">
            Put your Python
            <br />
            <em>skills in play.</em>
          </h1>
          <p className="auth-intro">
            Meet an opponent. Solve the same problem. Keep a record of every round.
          </p>
          <MatchPreview />
          <div className="auth-details">
            <div>
              <span className="auth-feature-icon" aria-hidden="true">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="m8 6-6 6 6 6m8-12 6 6-6 6m-3-15-2 18" />
                </svg>
              </span>
              <strong>Run code in your browser</strong>
              <p>Write Python and check public examples in a focused workspace.</p>
            </div>
            <div>
              <span className="auth-feature-icon" aria-hidden="true">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
                </svg>
              </span>
              <strong>Make your profile yours</strong>
              <p>Choose a unique username, an avatar color, and your own bio.</p>
            </div>
            <div>
              <span className="auth-feature-icon" aria-hidden="true">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <rect x="5" y="3" width="14" height="18" rx="2" />
                  <path d="M8 8h8M8 12h8M8 16h5" />
                </svg>
              </span>
              <strong>Keep every result</strong>
              <p>Revisit completed matches and the problems you played.</p>
            </div>
          </div>
          <p className="auth-alpha">Casual beta. Verified ranked play is coming later.</p>
        </section>
        <section id="access" className="auth-access" aria-labelledby="access-title" tabIndex={-1}>
          <h2 id="access-title">{registering ? 'Make it your arena.' : 'Welcome to CodeClash.'}</h2>
          <p>
            {registering
              ? 'Create your account, choose a unique username, and find your first opponent.'
              : 'Sign in to play, save your matches, and build your player profile.'}
          </p>
          <nav className="auth-switch" aria-label="Account access">
            <a href="/login" aria-current={!registering ? 'page' : undefined}>
              Sign in
            </a>
            <a href="/register" aria-current={registering ? 'page' : undefined}>
              Create account
            </a>
          </nav>
          {loading ? (
            <p className="auth-status" role="status">
              Checking your session…
            </p>
          ) : error ? (
            <div className="auth-status" role="alert">
              <p>We couldn’t connect. Please try again.</p>
              <button className="button secondary" onClick={() => location.reload()}>
                Try again
              </button>
            </div>
          ) : (
            <AuthOptions
              local={health?.local === true}
              githubReady={health?.github === true}
              googleReady={health?.google === true}
              emailReady={health?.email === true}
              busy={busy}
              choose={choose}
            />
          )}
          <p className="auth-account-note">
            {registering
              ? 'Your first sign-in creates an account. Already played? Use the same provider to keep your existing progress.'
              : 'New here? Your first sign-in creates your account. No password to remember.'}
          </p>
          <p className="auth-legal">
            By continuing, you agree to our <a href="/terms">Terms</a>. See our{' '}
            <a href="/privacy">Privacy notice</a> for how we handle your data.
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

const previewCode = [
  'def two_sum(nums, target):',
  '    seen = {}',
  '    for i, num in enumerate(nums):',
  '        complement = target - num',
  '        if complement in seen:',
  '            return [seen[complement], i]',
  '        seen[num] = i',
  '    return []',
];
function MatchPreview() {
  return (
    <section className="auth-match" aria-label="Illustrative Python match preview">
      <div className="auth-match-caption">
        <span>Match preview</span>
        <span>Python · 20-minute matches</span>
      </div>
      <div className="auth-match-players">
        <div className="auth-match-player">
          <span className="match-initial">A</span>
          <div>
            <strong>AlexR</strong>
            <small>Writing a solution</small>
          </div>
        </div>
        <div className="auth-match-clock">
          <strong>19:42</strong>
          <small>SHARED CLOCK</small>
        </div>
        <div className="auth-match-player opponent">
          <div>
            <strong>Jules</strong>
            <small>Writing a solution</small>
          </div>
          <span className="match-initial">J</span>
        </div>
      </div>
      <div className="auth-match-workspace">
        <article className="auth-match-problem">
          <div className="preview-pane-heading">
            THE PROBLEM <span>Easy</span>
          </div>
          <h2>Two Sum</h2>
          <p>
            Given a list of integers and a target, return the indices of the two numbers that add up
            to the target.
          </p>
          <p>You may assume there is exactly one pair. Each element can be used only once.</p>
          <div className="preview-example">
            <strong>Example</strong>
            <code>
              nums = [2, 7, 11, 15]
              <br />
              target = 9<br />
              output = [0, 1]
            </code>
            <p>2 + 7 = 9</p>
          </div>
        </article>
        <div className="auth-match-editor">
          <div className="preview-pane-heading">
            <span>solution.py</span>
            <span>Python 3</span>
          </div>
          <pre aria-label="Example Python solution">
            <code>
              {previewCode.map((line, index) => (
                <span className="preview-code-line" key={line}>
                  <span className="preview-line-number" aria-hidden="true">
                    {index + 1}
                  </span>
                  <span
                    className={/def |for |if |return /.test(line) ? 'preview-code-keyword' : ''}
                  >
                    {line}
                  </span>
                </span>
              ))}
            </code>
          </pre>
          <div className="preview-result">
            <span className="preview-result-check" aria-hidden="true">
              ✓
            </span>
            <div>
              <strong>Public example passed</strong>
              <code>Expected [0, 1] · Output [0, 1]</code>
            </div>
            <span className="preview-result-label">EXAMPLE RUN</span>
          </div>
        </div>
      </div>
    </section>
  );
}
