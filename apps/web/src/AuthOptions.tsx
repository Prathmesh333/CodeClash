import { useState } from 'react';
import { api } from './api';
export type AuthOptionsProps = {
  local: boolean;
  githubReady: boolean;
  googleReady: boolean;
  emailReady: boolean;
  busy: boolean;
  choose: (id: string) => void;
};
export default function AuthOptions({
  local,
  githubReady,
  googleReady,
  emailReady,
  busy,
  choose,
}: AuthOptionsProps) {
  const [email, setEmail] = useState('');
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailMessage, setEmailMessage] = useState('');
  return (
    <div className="auth-options">
      {local ? (
        <div className="demo-players">
          {[
            ['alice', 'AdaByte'],
            ['bob', 'LoopRunner'],
            ['cora', 'StackSmith'],
            ['dan', 'BitWalker'],
          ].map(([id, name]) => (
            <button disabled={busy} key={id} onClick={() => choose(id)}>
              <span className="avatar">{name.slice(0, 2).toUpperCase()}</span>
              <span>{name}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="signin-options">
          {githubReady && (
            <a className="button secondary" href="/api/auth/github">
              Continue with GitHub
            </a>
          )}
          {googleReady ? (
            <a className="button secondary" href="/api/auth/google">
              Continue with Google
            </a>
          ) : (
            <button className="button secondary" disabled>
              Google · Coming soon
            </button>
          )}
          {emailReady ? (
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                if (emailBusy) return;
                setEmailBusy(true);
                setEmailMessage('');
                try {
                  const result = await api<{ message: string }>('/auth/email', { email });
                  setEmailMessage(result.message);
                } catch (error) {
                  setEmailMessage(error instanceof Error ? error.message : 'Please try again.');
                } finally {
                  setEmailBusy(false);
                }
              }}
            >
              <label htmlFor="signin-email">Or use your email</label>
              <input
                id="signin-email"
                type="email"
                autoComplete="email"
                maxLength={254}
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
              />
              <button className="button primary" disabled={emailBusy}>
                {emailBusy ? 'Sending…' : 'Email me a sign-in link'}
              </button>
              {emailMessage && <p role="status">{emailMessage}</p>}
            </form>
          ) : (
            <button className="button secondary" disabled>
              Email sign-in · Coming soon
            </button>
          )}
        </div>
      )}
    </div>
  );
}
