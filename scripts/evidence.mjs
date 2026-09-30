import { readFile } from 'node:fs/promises';
const inputIndex = process.argv.indexOf('--input');
const path = inputIndex < 0 ? undefined : process.argv[inputIndex + 1];
if (!path || path.startsWith('--')) {
  console.error('BLOCKED: provide --input <release-report.json>.');
  process.exit(2);
}
try {
  const report = JSON.parse(await readFile(path, 'utf8'));
  for (const gate of ['local', 'judgeSecurity', 'staging', 'fairness', 'restore', 'soak']) {
    if (report[gate] !== 'PASS') throw new Error(`${gate} is not PASS`);
  }
  if (!Array.isArray(report.runs) || report.runs.length < 3)
    throw new Error('Three real-judge runs required.');
  const seeds = new Set();
  const limits = {
    queueP95Ms: 10000,
    restP95Ms: 300,
    restP99Ms: 1000,
    wsP95Ms: 250,
    reconnectP95Ms: 3000,
    judgeQueueP95Ms: 5000,
    verdictP95Ms: 10000,
    verdictP99Ms: 30000,
    settlementP95Ms: 5000,
    settlementMaxMs: 60000,
    recoveryMaxMs: 120000,
  };
  for (const run of report.runs) {
    if (!Number.isSafeInteger(run.seed) || seeds.has(run.seed))
      throw new Error('Runs require distinct integer seeds.');
    seeds.add(run.seed);
    if (
      run.judge !== 'real' ||
      run.players !== 100 ||
      run.rounds !== 20 ||
      run.invariantViolations !== 0 ||
      run.status !== 'PASS' ||
      run.profile !== 'release-gate'
    )
      throw new Error('A 100-player release-gate run did not pass.');
    if (
      run.completedMatches !== 1000 ||
      run.activeRoomMinimum !== 50 ||
      run.activeRoomPeak !== 50 ||
      run.lostAcceptedJobs !== 0 ||
      run.orphanAttemptsAfter120s !== 0
    )
      throw new Error('Incomplete match, concurrency or cleanup evidence.');
    for (const [metric, maximum] of Object.entries(limits)) {
      const value = run.metrics?.[metric];
      if (!Number.isFinite(value) || value < 0 || value > maximum)
        throw new Error(`Seed ${run.seed}: ${metric} is missing or exceeds its threshold.`);
    }
    const m = run.metrics;
    if (
      !Number.isFinite(m.reconnectSuccessRate) ||
      m.reconnectSuccessRate < 0.99 ||
      m.reconnectSuccessRate > 1 ||
      !Number.isFinite(m.unexpectedErrorRate) ||
      m.unexpectedErrorRate < 0 ||
      m.unexpectedErrorRate >= 0.005
    )
      throw new Error('Reconnect or error-rate gate failed.');
    if (
      !Number.isFinite(run.budgetUsd) ||
      run.budgetUsd <= 0 ||
      !Number.isFinite(run.spendUsd) ||
      run.spendUsd < 0 ||
      run.spendUsd > run.budgetUsd
    )
      throw new Error('Missing or exceeded test budget.');
    if (
      !Array.isArray(run.artifacts) ||
      !run.artifacts.length ||
      run.artifacts.some((value) => typeof value !== 'string' || !value.trim())
    )
      throw new Error('Raw evidence artifact references required.');
  }
  console.log(
    'CHECKLIST COMPLETE: reported metrics meet thresholds. Independently inspect the referenced raw evidence before promotion; this tool does not authenticate reports.',
  );
} catch (error) {
  console.error('NO-GO:', error.message);
  process.exit(1);
}
