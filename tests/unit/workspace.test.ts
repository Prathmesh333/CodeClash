import { it, expect } from 'vitest';
import { summarizePythonError } from '../../apps/web/src/python/usePythonRun';
import { executableSource } from '../../apps/web/src/python/execution';
it('summarizes the actual solution error while leaving the full traceback available', () => {
  expect(
    summarizePythonError(
      'PythonError: Traceback (most recent call last):\n  File "/lib/python.zip/_pyodide/base.py", line 539\n  File "solution.py", line 6, in solve\nNameError: name \'n\' is not defined',
    ),
  ).toBe("Line 6: NameError: name 'n' is not defined");
  expect(summarizePythonError('Stopped after the 5-second execution limit.')).toBe(
    'Stopped after the 5-second execution limit.',
  );
});
it('keeps legacy scripts intact and supplies IO only to function solutions', () => {
  expect(executableSource('print(input())', 'script')).toBe('print(input())');
  expect(executableSource('def solve(data): return data', 'function')).toContain(
    'print(__cc_json.dumps(solve(__cc_data)',
  );
});
