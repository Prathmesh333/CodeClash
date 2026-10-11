// Shared execution contract. Both modes use the same isolated browser runner.

// A future server adapter must return authoritative verdicts separately from local results.

export type ExecutionMode = 'script' | 'function';

export const FUNCTION_STARTER =
  'def solve(data):\n    # Return the answer for the input described in the problem.\n    pass\n';

export function executableSource(source: string, mode: ExecutionMode) {
  return mode === 'script'
    ? source
    : source +
        '\n\nimport json as __cc_json\n__cc_data = __cc_json.loads(input())\nprint(__cc_json.dumps(solve(__cc_data), separators=(",", ":")))\n';
}
