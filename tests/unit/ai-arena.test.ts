import { describe, it, expect } from 'vitest';
import { arenaSuite, previewScore, remainingSeconds } from '../../packages/ai-arena';
describe('AI Arena preview contract', () => {
  it('scores only unique public-suite problem ids', () => {
    const id = arenaSuite.problems[0].id;
    expect(previewScore([id, id, 'forged-id'])).toBe(100);
    expect(previewScore(arenaSuite.problems.map((p) => p.id))).toBe(1000);
  });
  it('never exposes solutions or hidden fixtures in the manifest', () => {
    expect(arenaSuite.problems).toHaveLength(10);
    for (const p of arenaSuite.problems) {
      expect(p.examples.length).toBeGreaterThan(0);
      expect(p).not.toHaveProperty('tests');
      expect(p).not.toHaveProperty('referenceSolution');
      expect(p).not.toHaveProperty('editorial');
    }
  });
  it('uses an absolute deadline and clamps expiration', () => {
    expect(remainingSeconds(10000, 9001)).toBe(1);
    expect(remainingSeconds(10000, 15000)).toBe(0);
  });
});
