import { useState } from 'react';

import { usePythonRun } from './usePythonRun';

export default function CustomRun({
  source,
  run,
  disabled = false,
}: {
  source: string;
  run: ReturnType<typeof usePythonRun>;
  disabled?: boolean;
}) {
  const [input, setInput] = useState('');

  return (
    <div className="runner-console">
      <label>
        Custom input
        <textarea
          aria-label="Custom input"
          value={input}
          maxLength={65536}
          onChange={(e) => setInput(e.target.value)}
        />
      </label>

      <button
        className="button secondary"
        disabled={disabled || !!run.status}
        onClick={() => void run.run(source, [{ input, output: '' }], false)}
      >
        Run custom input
      </button>
    </div>
  );
}
