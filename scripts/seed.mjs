import { mkdir, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { problems, publicProblem } from '../database/problems.mjs';
const quote = (value) => "'" + String(value).replaceAll("'", "''") + "'";
const lines = [];
for (const [id, name] of [
  ['alice', 'AdaByte'],
  ['bob', 'LoopRunner'],
  ['cora', 'StackSmith'],
  ['dan', 'BitWalker'],
])
  lines.push(
    `INSERT OR IGNORE INTO users(id,auth_subject,username,created_at) VALUES (${quote(id)},${quote('local:' + id)},${quote(name)},${Date.now()});`,
  );
for (const problem of problems) {
  const tests = problem.tests,
    pub = publicProblem(problem);
  lines.push(
    `INSERT INTO problems(id,public_json,private_json) VALUES (${quote(problem.id)},${quote(JSON.stringify(pub))},${quote(JSON.stringify([...problem.examples.map((e) => ({ input: e.input, output: e.output })), ...tests]))}) ON CONFLICT(id) DO UPDATE SET private_json=excluded.private_json WHERE problems.version=1 AND problems.public_json=excluded.public_json;`,
  );
}
await mkdir('work', { recursive: true });
await writeFile('work/seed.sql', lines.join('\n'));
const args = process.argv.slice(2);
const configIndex = args.indexOf('--config');
const config =
  configIndex >= 0 && args[configIndex + 1] ? args[configIndex + 1] : 'apps/worker/wrangler.jsonc';
const passthrough = args.filter(
  (value, index) => value !== '--config' && (index === 0 || args[index - 1] !== '--config'),
);
const result = spawnSync(
  process.execPath,
  [
    'node_modules/wrangler/bin/wrangler.js',
    'd1',
    'execute',
    'DB',
    '--local',
    '--config',
    config,
    '--file',
    'work/seed.sql',
    ...passthrough,
  ],
  { stdio: 'inherit' },
);
process.exit(result.status ?? 1);
