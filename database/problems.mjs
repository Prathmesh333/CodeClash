import { extendLegacy } from './legacy-cases.mjs';
import { expandedProblems, referenceNotes } from './ranked-bank.mjs';
const make = (
  id,
  title,
  topic,
  statement,
  inputFormat,
  outputFormat,
  constraints,
  examples,
  tests,
  starterCode,
  difficulty = 'Easy',
) => ({
  id,
  version: 1,
  title,
  topic,
  statement,
  inputFormat,
  outputFormat,
  constraints,
  examples,
  starterCode,
  difficulty,
  tests,
});
export const problems = [
  make(
    'signal-pair',
    'Signal pair',
    'Hash maps',
    'A relay station receives a sequence of signal strengths. Find two distinct positions whose strengths add up to the target. Print the two zero-based positions in increasing order. Exactly one pair exists.',
    'The first line contains n and target. The second line contains n integers.',
    'Two zero-based indices, separated by a space.',
    ['2 ≤ n ≤ 100,000', '−10⁹ ≤ strength, target ≤ 10⁹', 'Exactly one valid pair exists.'],
    [
      {
        input: '4 9\n2 7 11 15\n',
        output: '0 1\n',
        explanation: 'The strengths at positions 0 and 1 add up to 9.',
      },
    ],
    [
      { input: '3 6\n3 2 3\n', output: '0 2\n' },
      { input: '4 0\n-4 8 4 2\n', output: '0 2\n' },
    ],
    'import sys\n\ndef solve():\n    n, target = map(int, input().split())\n    signals = list(map(int, input().split()))\n    # Find the two positions.\n    pass\n\nif __name__ == "__main__":\n    solve()\n',
  ),
  make(
    'quiet-window',
    'Quiet window',
    'Sliding window',
    'A sensor logs n integer readings. Find the largest sum of any k consecutive readings.',
    'First line: n k. Second line: n integers.',
    'The maximum window sum.',
    ['1 ≤ k ≤ n ≤ 100,000', '−10,000 ≤ reading ≤ 10,000'],
    [{ input: '6 3\n2 1 5 1 3 2\n', output: '9\n' }],
    [
      { input: '3 2\n-5 -2 -3\n', output: '-5\n' },
      { input: '1 1\n7\n', output: '7\n' },
    ],
    'n, k = map(int, input().split())\nreadings = list(map(int, input().split()))\n# Print the largest sum of k consecutive readings.\n',
  ),
  make(
    'balanced-beacons',
    'Balanced beacons',
    'Stacks',
    'A beacon message consists only of parentheses. Decide whether every opening parenthesis is correctly closed.',
    'One line containing the message.',
    'YES if balanced; otherwise NO.',
    ['1 ≤ message length ≤ 100,000'],
    [{ input: '(()())\n', output: 'YES\n' }],
    [
      { input: ')(()\n', output: 'NO\n' },
      { input: '((\n', output: 'NO\n' },
      { input: '()()\n', output: 'YES\n' },
    ],
    'message = input().strip()\n# Check whether the message is balanced.\n',
  ),
  make(
    'missing-crate',
    'Missing crate',
    'Arrays',
    'Crates are numbered from 0 through n. Exactly one number is missing from the n numbers provided. Find it.',
    'First line: n. Second line: n distinct crate numbers.',
    'The missing number.',
    ['1 ≤ n ≤ 100,000', '0 ≤ crate number ≤ n'],
    [{ input: '3\n3 0 1\n', output: '2\n' }],
    [
      { input: '1\n0\n', output: '1\n' },
      { input: '4\n1 2 3 4\n', output: '0\n' },
    ],
    'n = int(input())\ncrates = list(map(int, input().split()))\n# Find the missing crate.\n',
  ),
  make(
    'unique-frequency',
    'Unique frequency',
    'Strings',
    'Find the position of the first character that appears exactly once in a lowercase message. Print -1 if none exists.',
    'One lowercase ASCII string.',
    'The zero-based position or -1.',
    ['1 ≤ length ≤ 100,000'],
    [{ input: 'radar\n', output: '2\n' }],
    [
      { input: 'aabb\n', output: '-1\n' },
      { input: 'abc\n', output: '0\n' },
    ],
    'message = input().strip()\n# Find the first non-repeating character.\n',
  ),
  make(
    'sorted-checkpoint',
    'Sorted checkpoint',
    'Binary search',
    'Find the first position in a sorted array whose value is greater than or equal to x. Print n if every value is smaller.',
    'First line: n x. Second line: n sorted integers.',
    'A zero-based position, or n.',
    ['1 ≤ n ≤ 100,000', '−10⁹ ≤ values, x ≤ 10⁹'],
    [{ input: '5 4\n1 3 4 4 8\n', output: '2\n' }],
    [
      { input: '3 9\n1 2 3\n', output: '3\n' },
      { input: '3 0\n1 2 3\n', output: '0\n' },
    ],
    'n, x = map(int, input().split())\nvalues = list(map(int, input().split()))\n# Find the first value >= x.\n',
  ),
];

for (const p of problems) {
  const [referenceSolution, explanation, timeComplexity, spaceComplexity] = referenceNotes[p.id];
  Object.assign(p, {
    referenceSolution,
    editorial: { explanation, timeComplexity, spaceComplexity },
  });
}
extendLegacy(problems);
problems.push(...expandedProblems);
// Avoid charging the judge for duplicate generated inputs; conflicting answers fail fast.
for (const problem of problems) {
  const seen = new Map(problem.examples.map((test) => [test.input, test.output]));
  problem.tests = problem.tests.filter((test) => {
    if (seen.has(test.input)) {
      if (seen.get(test.input) !== test.output)
        throw new Error(`Conflicting fixture: ${problem.id}`);
      return false;
    }
    seen.set(test.input, test.output);
    return true;
  });
}
export function publicProblem(p) {
  const {
    id,
    version,
    title,
    topic,
    statement,
    inputFormat,
    outputFormat,
    constraints,
    examples,
    starterCode,
    difficulty,
  } = p;
  return {
    id,
    version,
    title,
    topic,
    statement,
    inputFormat,
    outputFormat,
    constraints,
    examples,
    starterCode,
    difficulty,
  };
}
