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
              <ProviderLogo provider="github" />
              Continue with GitHub
            </a>
          )}
          {googleReady ? (
            <a className="button secondary" href="/api/auth/google">
              <ProviderLogo provider="google" />
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
function ProviderLogo({ provider }: { provider: 'github' | 'google' }) {
  return provider === 'github' ? (
    <svg
      className="provider-logo"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 .5a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.23c-3.34.73-4.04-1.42-4.04-1.42-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.21.09 1.85 1.24 1.85 1.24 1.07 1.84 2.81 1.31 3.49 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.34-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.6-2.81 5.62-5.49 5.92.43.37.82 1.1.82 2.22v3.3c0 .32.22.69.83.57A12 12 0 0 0 12 .5Z" />
    </svg>
  ) : (
    <svg className="provider-logo" width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M43.6 20.5H24v8h11.3c-.5 2.6-2 4.8-4.2 6.2v5.1H38c4-3.7 6.3-9.1 6.3-15.5 0-1.3-.1-2.6-.3-3.8Z"
      />
      <path
        fill="#34A853"
        d="M24 44c5.7 0 10.5-1.9 14-5.1l-6.9-5.3c-1.9 1.3-4.3 2-7.1 2-5.5 0-10.2-3.7-11.9-8.6H5v5.5C8.5 39.3 15.7 44 24 44Z"
      />
      <path
        fill="#FBBC05"
        d="M12.1 27c-.4-1.2-.7-2.5-.7-3.8s.2-2.6.7-3.8v-5.5H5a20 20 0 0 0 0 18.6Z"
      />
      <path
        fill="#EA4335"
        d="M24 11.6c3.1 0 5.9 1.1 8.1 3.2l6.1-6.1C34.5 5.3 29.7 3.2 24 3.2 15.7 3.2 8.5 7.9 5 14.8l7.1 5.5c1.7-5 6.4-8.7 11.9-8.7Z"
      />
    </svg>
  );
}
