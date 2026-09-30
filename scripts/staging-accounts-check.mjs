const base = process.env.STAGING_URL;
if (!base || !base.startsWith('https://'))
  throw new Error('Set STAGING_URL to the deployed HTTPS origin.');
const health = await fetch(new URL('/api/health', base));
const state = await health.json();
if (
  !health.ok ||
  state.environment !== 'staging' ||
  state.local !== false ||
  state.judge !== 'unavailable'
)
  throw new Error('Unexpected account-only staging health.');
for (const path of ['/api/auth/local', '/api/test/state']) {
  const response = await fetch(
    new URL(path, base),
    path.endsWith('local')
      ? {
          method: 'POST',
          headers: { Origin: base, 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: 'alice' }),
        }
      : {},
  );
  if (response.status !== 404)
    throw new Error(`${path} must be disabled on staging: ${response.status}`);
}
const login = await fetch(new URL('/api/auth/github', base), { redirect: 'manual' });
if (
  login.status !== 302 ||
  !login.headers.get('location')?.startsWith('https://github.com/login/oauth/authorize?')
)
  throw new Error('GitHub login is not configured.');
console.log(
  'PASS account-only staging boundary checks. Complete a real GitHub sign-in and cross-device persistence check before sharing. Ranked gameplay remains disabled.',
);
