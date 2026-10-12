import problems from '../../../packages/public-problems.json';
import { publicSeo } from '../../../packages/seo';
import SiteFooter from './SiteFooter';
export const discoveryPaths = Object.keys(publicSeo).filter((p) =>
  /^\/(problems|topics|learn|about|ai-arena)(\/|$)/.test(p),
);
const guides = {
  'dictionary-lookup': {
    title: 'Use dictionary lookup to avoid repeated searches',
    text: 'A dictionary records information you will need later. For duplicate detection, a set is enough: check membership before inserting each value. Average lookup is constant time, so the full scan takes expected O(n) time and O(n) extra space. Hash collisions can worsen performance; do not treat this as a worst-case guarantee.',
    code: 'def has_duplicate(values):\n    seen = set()\n    for value in values:\n        if value in seen:\n            return True\n        seen.add(value)\n    return False\n\nassert has_duplicate([2, 7, 2])\nassert not has_duplicate([2, 7])',
  },
  'sliding-windows': {
    title: 'Find a longest substring with a sliding window',
    text: 'Keep a left boundary and the most recent position of each character. When a character repeats inside the current window, move the left boundary past its previous position. Never move it backwards. Each character is visited once: expected O(n) time and O(u) space for u distinct characters. Sum-based windows need additional assumptions: negative values can break the usual expand-and-shrink rule.',
    code: 'def longest_unique(text):\n    last = {}\n    left = best = 0\n    for right, char in enumerate(text):\n        left = max(left, last.get(char, -1) + 1)\n        last[char] = right\n        best = max(best, right - left + 1)\n    return best\n\nassert longest_unique("abba") == 2\nassert longest_unique("") == 0',
  },
  'python-errors': {
    title: 'Read a Python runtime error',
    text: 'Start with the last line: it names the error and often the missing value. Then find the last solution.py frame to locate your own code. NameError means a name was not defined in the current scope. Read input and assign it before using it. A runtime error is different from a wrong answer: the program did not finish normally. Avoid catching every exception, because that hides the useful traceback.',
    code: 'import json\n\ndef solve(data):\n    values = data["values"]\n    n = len(values)\n    return {"length": n}\n\nassert solve({"values": [3, 5]}) == {"length": 2}\n# In the editor: print(json.dumps(solve(json.loads(input()))))',
  },
};
export default function DiscoveryPage({ path }: { path: string }) {
  const problem = problems.find((p) => path === '/problems/' + p.id);
  const topic = path.startsWith('/topics/') ? path.split('/')[2] : '';
  const guide = guides[path.split('/')[2] as keyof typeof guides];
  const selected = topic
    ? problems.filter((p) =>
        topic === 'arrays'
          ? /array|hash|window|stack/i.test(p.topic)
          : topic === 'strings'
            ? /string|dynamic/i.test(p.topic)
            : /graph/i.test(p.topic),
      )
    : problems;
  return (
    <>
      <header className="legal-header">
        <a href="/">CodeClash</a>
        <nav>
          <a href="/problems">Problems</a>
          {' · '}
          <a href="/learn">Learn</a>
          {' · '}
          <a href="/login">Sign in</a>
        </nav>
      </header>
      <main className="legal-page" id="main">
        {problem ? (
          <>
            <h1>{problem.title}</h1>
            <p>
              {problem.difficulty} · {problem.topic} · Original CodeClash problem
            </p>
            <p>{problem.statement}</p>
            <h2>Input and output</h2>
            <p>{problem.inputFormat}</p>
            <p>{problem.outputFormat}</p>
            <h2>Examples</h2>
            {problem.examples.map((e, i) => (
              <section key={i}>
                <h3>Example {i + 1}</h3>
                <pre>{'Input: ' + e.input + 'Output: ' + e.output}</pre>
              </section>
            ))}
            <h2>Constraints</h2>
            <ul>
              {problem.constraints.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
            <a className="button primary" href={'/app?view=practice&problem=' + problem.id}>
              Solve in Python
            </a>
            <p>
              Sign in to save progress. Public example runs are unverified and do not affect
              ratings.
            </p>
          </>
        ) : path === '/about' ? (
          <>
            <h1>About CodeClash</h1>
            <p>
              CodeClash is an independent coding project operated by Prathamesh Nikam in India. It
              brings live one-on-one Python duels and untimed DSA practice into one app.
            </p>
            <p>
              The current beta runs Python on your device. Casual results do not affect ratings.
              Original practice questions cover a range of foundational algorithms; they are not an
              official LeetCode or NeetCode collection.
            </p>
            <p>
              We prioritize useful problems, clear feedback and preserving your saved work. Verified
              ranked play and AI benchmarking require further judge and fairness validation.
            </p>
            <a href="/contact">Contact the operator</a>
          </>
        ) : path === '/ai-arena' ? (
          <>
            <h1>AI Arena</h1>
            <p>
              A proposed benchmark for coding agents: ten original problems in a shared 10- or
              15-minute run. This is a design preview; agent submissions and a verified leaderboard
              are not available yet.
            </p>
            <h2>What should a score mean?</h2>
            <p>
              Each problem contributes up to 100 points from private test groups. A full solve
              requires every correctness group and the efficiency group. Total score is out of
              1,000. The server deadline counts model reasoning, tool calls and submissions. Device
              execution times will not determine rank.
            </p>
            <h2>Proposed challenge families</h2>
            <ol>
              {[
                'Temporal parity connectivity with edge removal',
                'Dynamic maximum subarray range queries',
                'Time-budgeted routes with toll coupons',
                'Graph routes avoiding forbidden string patterns',
                'Exact quadratic partition of signed arrays',
                'Weighted sliding-window median costs',
                'Flow with vertex and edge capacities',
                'Tree selection with ancestor conflicts and a budget',
                'Range XOR subset counts',
                'Digit counting with forbidden patterns',
              ].map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ol>
            <h2>Before rankings open</h2>
            <ul>
              <li>Independently verify solutions, edge cases and partial-credit groups.</li>
              <li>Calibrate difficulty using multiple models and repeat runs.</li>
              <li>
                Run submissions in isolated server execution with hidden tests, network restrictions
                and resource limits.
              </li>
              <li>Record model version, tools, token budget, run seed and costs.</li>
              <li>Publish uncertainty across repeated runs and keep held-out problems private.</li>
            </ul>
            <p>
              We will create original statements and fixtures rather than copy or lightly modify
              LeetCode questions. Public browser results cannot establish trustworthy agent
              rankings.
            </p>
          </>
        ) : guide && path.startsWith('/learn/') ? (
          <>
            <h1>{guide.title}</h1>
            <p>{guide.text}</p>
            <pre>
              <code>{guide.code}</code>
            </pre>
            <p>These examples use Python 3 and include assertions you can run locally.</p>
            <a href="/problems">Try an original practice problem</a>
          </>
        ) : path === '/learn' ? (
          <>
            <h1>Python problem-solving guides</h1>
            <ul>
              {Object.entries(guides).map(([id, g]) => (
                <li key={id}>
                  <a href={'/learn/' + id}>{g.title}</a>
                </li>
              ))}
            </ul>
          </>
        ) : path === '/topics' ? (
          <>
            <h1>Explore DSA topics</h1>
            <ul>
              {['arrays', 'strings', 'graphs'].map((t) => (
                <li key={t}>
                  <a href={'/topics/' + t}>{t}</a>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <>
            <h1>
              {topic
                ? topic[0].toUpperCase() + topic.slice(1) + ' practice'
                : 'Original Python practice problems'}
            </h1>
            <p>
              Read the problem before signing in. Examples show the input contract; passing them
              does not prove correctness on every input.
            </p>
            <ul>
              {selected.map((p) => (
                <li key={p.id}>
                  <a href={'/problems/' + p.id}>{p.title}</a> · {p.difficulty} · {p.topic}
                </li>
              ))}
            </ul>
            <a href="/topics">Browse topics</a>
            {' · '}
            <a href="/learn">Read the Python guides</a>
          </>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
