import problems from './public-problems.json' with { type: 'json' };
export const arenaSuite = {
  id: 'python-foundations-v1',
  version: '1.0.0',
  title: 'Python Foundations',
  verification: 'local-examples' as const,
  problems,
};
export type ArenaSummary = {
  id: string;
  agent: string;
  duration: number;
  finishedAt: number;
  passed: string[];
  score: number;
};
export function previewScore(ids: string[]) {
  return new Set(ids.filter((id) => problems.some((p) => p.id === id))).size * 100;
}
export function remainingSeconds(deadline: number, now: number) {
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}
