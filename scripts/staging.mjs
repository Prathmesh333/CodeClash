import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { problems, publicProblem } from '../database/problems.mjs';
const config = 'apps/worker/wrangler.staging.jsonc';
const settings = JSON.parse(await readFile(config, 'utf8'));
const action = process.argv[2];
if (!['check', 'migrate', 'seed', 'deploy'].includes(action))
  throw new Error('Use check, migrate, seed or deploy.');
if (
  settings.name !== 'ranked-dsa-staging' ||
  settings.vars.APP_ENV !== 'staging' ||
  settings.vars.TEST_EVIDENCE !== 'false' ||
  settings.vars.JUDGE_ENABLED !== 'false'
)
  throw new Error('Expected staging with server judging disabled.');
if (
  !/^https:\/\/[a-z0-9.-]+$/.test(settings.vars.APP_ORIGIN) ||
  settings.vars.APP_ORIGIN.includes('YOUR_')
)
  throw new Error('Set the real staging HTTPS origin first.');
const db = settings.d1_databases[0];
if (
  db.database_name !== 'ranked-dsa-staging' ||
  !/^[a-f0-9-]{36}$/i.test(db.database_id) ||
  db.database_id === '00000000-0000-0000-0000-000000000001'
)
  throw new Error('Set the dedicated Cloudflare staging D1 database ID first.');
const run = (args) => {
  const r = spawnSync(
    process.execPath,
    ['node_modules/wrangler/bin/wrangler.js', ...args, '--config', config],
    { stdio: 'inherit' },
  );
  if (r.status !== 0) process.exit(r.status ?? 1);
};
if (action === 'migrate') run(['d1', 'migrations', 'apply', 'DB', '--remote']);
if (action === 'seed') {
  const quote = (value) => "'" + String(value).replaceAll("'", "''") + "'";
  // Cloud seed deliberately excludes demo users and never overwrites a published question.
  const sql = problems
    .map(
      (p) =>
        `INSERT OR IGNORE INTO problems(id,version,public_json,private_json) VALUES (${quote(p.id)},${p.version},${quote(JSON.stringify(publicProblem(p)))},${quote(JSON.stringify([...p.examples.map(({ input, output }) => ({ input, output })), ...p.tests]))});`,
    )
    .join('\n');
  await mkdir('work', { recursive: true });
  await writeFile('work/staging-questions.sql', sql);
  run(['d1', 'execute', 'DB', '--remote', '--file', 'work/staging-questions.sql']);
}
if (action === 'deploy') {
  run([
    'd1',
    'execute',
    'DB',
    '--remote',
    '--command',
    'SELECT (SELECT COUNT(*) FROM problems) AS questions, (SELECT COUNT(*) FROM users) AS users, (SELECT COUNT(*) FROM submissions) AS submissions, (SELECT COUNT(*) FROM oauth_states) AS oauth_states',
  ]);
  run(['deploy']);
}
console.log(`Staging ${action} complete. Origin: ${settings.vars.APP_ORIGIN}`);
