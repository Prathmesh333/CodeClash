import { mkdir, writeFile } from 'node:fs/promises';
import { problems } from '../database/problems.mjs';
await mkdir('work', { recursive: true });
await writeFile(
  'work/reference-solutions.json',
  JSON.stringify(Object.fromEntries(problems.map((p) => [p.id, p.referenceSolution])), null, 2),
);
console.log(
  'Wrote private simulation input to work/reference-solutions.json. Keep this out of web assets.',
);
