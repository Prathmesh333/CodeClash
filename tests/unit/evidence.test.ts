import { expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
const run = (report: unknown) => {
  const dir = mkdtempSync(join(tmpdir(), 'rdsa-evidence-'));
  try {
    const file = join(dir, 'report.json');
    writeFileSync(file, JSON.stringify(report));
    return spawnSync(process.execPath, ['scripts/evidence.mjs', '--input', file], {
      encoding: 'utf8',
    });
  } finally {
    if (
      dirname(resolve(dir)) !== resolve(tmpdir()) ||
      !resolve(dir).startsWith(join(resolve(tmpdir()), 'rdsa-evidence-'))
    )
      throw new Error('Unexpected fixture directory');
    rmSync(dir, { recursive: true, force: true });
  }
};
const report = () => ({
  local: 'PASS',
  judgeSecurity: 'PASS',
  staging: 'PASS',
  fairness: 'PASS',
  restore: 'PASS',
  soak: 'PASS',
  runs: [101, 202, 303].map((seed) => ({
    seed,
    judge: 'real',
    players: 100,
    rounds: 20,
    invariantViolations: 0,
    status: 'PASS',
    profile: 'release-gate',
    completedMatches: 1000,
    activeRoomMinimum: 50,
    activeRoomPeak: 50,
    lostAcceptedJobs: 0,
    orphanAttemptsAfter120s: 0,
    budgetUsd: 10,
    spendUsd: 1,
    artifacts: ['test-fixture-only'],
    metrics: {
      queueP95Ms: 1,
      restP95Ms: 1,
      restP99Ms: 1,
      wsP95Ms: 1,
      reconnectP95Ms: 1,
      judgeQueueP95Ms: 1,
      verdictP95Ms: 1,
      verdictP99Ms: 1,
      settlementP95Ms: 1,
      settlementMaxMs: 1,
      recoveryMaxMs: 1,
      reconnectSuccessRate: 1,
      unexpectedErrorRate: 0,
    },
  })),
});
it('accepts a structurally complete synthetic report without claiming authenticated proof', () => {
  const result = run(report());
  expect(result.status).toBe(0);
  expect(result.stdout).toContain('does not authenticate');
});
it('rejects copied seeds', () => {
  const r = report();
  r.runs[1].seed = 101;
  expect(run(r).status).toBe(1);
});
it('rejects passing labels with failed measured latency', () => {
  const r = report();
  r.runs[2].metrics.restP99Ms = 1001;
  expect(run(r).status).toBe(1);
});
it('rejects incomplete rounds and baseline profiles', () => {
  const r = report();
  r.runs[0].completedMatches = 999;
  expect(run(r).status).toBe(1);
  r.runs[0].completedMatches = 1000;
  r.runs[0].profile = 'baseline';
  expect(run(r).status).toBe(1);
});
