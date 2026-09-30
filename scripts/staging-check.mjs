const base = process.env.STAGING_URL;
if (!base || !base.startsWith('https://')) {
  console.error('BLOCKED: Set STAGING_URL to the deployed HTTPS staging origin.');
  process.exit(2);
}
const response = await fetch(new URL('/api/health', base));
const health = await response.json();
if (!response.ok || health.environment !== 'staging' || health.judge !== 'configured')
  throw new Error('Staging health/judge configuration failed.');
console.log(
  'PASS staging health. Run the authenticated two-player and real-judge suites before release.',
);
