import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { problems, publicProblem } from '../database/problems.mjs';

const python = process.env.PYTHON ?? (process.platform === 'win32' ? 'python' : 'python3');
const ids = new Set();
let count = 0;
for (const p of problems) {
  assert(!ids.has(p.id), `Duplicate id ${p.id}`);
  ids.add(p.id);
  assert(p.version === 1 && ['Easy', 'Medium', 'Hard'].includes(p.difficulty));
  assert(
    p.examples.length >= 1 && p.tests.length >= 8 && p.tests.length + p.examples.length <= 100,
    p.id + ' case count',
  );
  assert(
    p.referenceSolution && p.editorial?.timeComplexity && p.editorial?.spaceComplexity,
    p.id + ' editorial',
  );
  assert.equal(
    new Set([...p.examples, ...p.tests].map((c) => c.input)).size,
    p.examples.length + p.tests.length,
    p.id + ' duplicate input',
  );
  const pub = publicProblem(p);
  assert(!('referenceSolution' in pub) && !('tests' in pub) && !('editorial' in pub));
  for (const c of [...p.examples, ...p.tests]) {
    assert(typeof c.input === 'string' && typeof c.output === 'string');
    assert(Buffer.byteLength(c.input) <= 1048576, p.id + ' judge input bound');
    assert(Buffer.byteLength(c.output) <= 65536, p.id + ' judge output bound');
  }
  assert(
    p.tests.some((c) => c.output !== p.examples[0].output),
    p.id + ' must reject constant example output',
  );
  assert(
    Buffer.byteLength(JSON.stringify(p.tests)) + Buffer.byteLength(JSON.stringify(pub)) < 95000,
    p.id + ' storage/seed statement budget',
  );
  const run = spawnSync(python, ['-I', 'scripts/verify-problems.py'], {
    input: JSON.stringify(p),
    encoding: 'utf8',
    timeout: 15000,
    maxBuffer: 1024 * 1024,
  });
  assert.equal(run.status, 0, `${p.id}: ${run.error?.message ?? ''} ${run.stderr}`);
  count += Number(run.stdout.trim());
  console.log(`PASS ${p.id}: ${run.stdout.trim()} cases`);
}
console.log(
  `Verified ${problems.length} original ranked questions, ${count} cases. Reference correctness only; server isolation and load gates remain separate.`,
);
