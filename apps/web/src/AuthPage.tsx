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
          <a className="auth-preview" href="/app">
            Explore the arena
          </a>
          <ThemePicker />
        </div>
      </header>
      <main className="auth-layout">
        <section className="auth-hero" aria-labelledby="auth-title">
          <p className="auth-eyebrow">THE CODING DUEL</p>
          <h1 id="auth-title">
            A good problem.
            <br />A worthy rival.
            <br />
            <em>Your move.</em>
          </h1>
          <p className="auth-intro">
            Turn your next coding session into a live 1v1. Same problem. Same starting line. Two
            different ways to solve it.
          </p>
          <div className="auth-duel" aria-label="Two players solve the same Python problem">
            <div className="duel-player">
              <span className="duel-avatar">01</span>
              <div>
                <strong>You</strong>
                <small>Your approach</small>
              </div>
              <span className="duel-connection" />
            </div>
            <div className="duel-problem">
              <span>SHARED PROBLEM / PYTHON</span>
              <strong>Find the pair.</strong>
              <code>
                [2, 7, 11, 15] <span>target:</span> 9
              </code>
              <div className="duel-track">
                <i />
                <i />
              </div>
            </div>
            <div className="duel-player">
              <span className="duel-avatar rival">02</span>
              <div>
                <strong>Your opponent</strong>
                <small>Their approach</small>
              </div>
              <span className="duel-connection" />
            </div>
          </div>
          <div className="auth-details">
            <span>
              01 <strong>Meet your opponent</strong>
            </span>
            <span>
              02 <strong>Solve together</strong>
            </span>
            <span>
              03 <strong>Keep your progress</strong>
            </span>
          </div>
          <p className="auth-alpha">
            Casual Python duels are live. Verified ranked play is coming later.
          </p>
        </section>
        <section id="access" className="auth-access" aria-labelledby="access-title" tabIndex={-1}>
          <div className="auth-access-top">
            <span className="auth-eyebrow">
              {registering ? 'YOUR FIRST MOVE' : 'WELCOME TO CODECLASH'}
            </span>
          </div>
          <h2 id="access-title">
            {registering ? 'Make it your arena.' : 'Come for the problem.\nStay for the duel.'}
          </h2>
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
