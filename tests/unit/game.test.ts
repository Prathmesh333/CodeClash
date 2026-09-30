import { describe, it, expect } from 'vitest';
import {
  advance,
  compatible,
  elo,
  newGame,
  normalizeOutput,
  rank,
  resolve,
  RULES,
  type Game,
  type Submission,
  type User,
} from '../../packages/shared/game';
const users = ['a', 'b'].map((id) => ({
  id,
  username: id,
  rating: 1200,
  rating_version: 0,
  wins: 0,
  losses: 0,
  draws: 0,
  games_played: 0,
})) as [User, User];
function game() {
  const g = newGame('match', users, 'test', 0);
  g.phase = 'ACTIVE';
  g.startedAt = 0;
  g.endsAt = 10000;
  return g;
}
function sub(id: string, userId: string, time: number, verdict: Submission['verdict']): Submission {
  return {
    id,
    userId,
    receiptMs: time,
    verdict,
    seq: time,
    source: '',
    sourceHash: '',
    key: id,
    kind: 'submit',
    attempt: 1,
  };
}
describe('fair adjudication', () => {
  it('waits for an earlier submission even when a later AC completes first', () => {
    const g = game();
    g.submissions = [sub('a', 'a', 100, 'PENDING'), sub('b', 'b', 200, 'AC')];
    resolve(g, 300);
    expect(g.phase).toBe('RESOLVING');
    g.submissions[0].verdict = 'AC';
    resolve(g, 400);
    expect(g.outcome?.winnerId).toBe('a');
  });
  it('later AC wins when earlier submission is incorrect', () => {
    const g = game();
    g.submissions = [sub('a', 'a', 100, 'WA'), sub('b', 'b', 200, 'AC')];
    resolve(g, 300);
    expect(g.outcome?.winnerId).toBe('b');
  });
  it('ties within the same server millisecond', () => {
    const g = game();
    g.submissions = [sub('a', 'a', 100, 'AC'), sub('b', 'b', 100, 'AC')];
    resolve(g, 300);
    expect(g.outcome?.winnerId).toBeNull();
    expect(g.phase).toBe('FINISHED');
  });
  it('retains eligibility after deadline', () => {
    const g = game();
    g.submissions = [sub('a', 'a', 9999, 'PENDING')];
    resolve(g, 10000);
    expect(g.phase).toBe('RESOLVING');
    g.submissions[0].verdict = 'AC';
    resolve(g, 11000);
    expect(g.outcome?.winnerId).toBe('a');
  });
  it('resolves infrastructure ambiguity without a rating loss', () => {
    const g = game();
    g.submissions = [sub('a', 'a', 100, 'JUDGE_ERROR'), sub('b', 'b', 200, 'AC')];
    resolve(g, 300);
    resolve(g, 300 + RULES.resolution);
    expect(g.phase).toBe('NO_CONTEST');
    expect(g.outcome?.rated).toBe(false);
  });
  it('does not let a later irrelevant infrastructure error invalidate a winner', () => {
    const g = game();
    g.submissions = [sub('a', 'a', 100, 'AC'), sub('b', 'b', 200, 'JUDGE_ERROR')];
    resolve(g, 300);
    expect(g.outcome?.winnerId).toBe('a');
  });
  it('gives earlier accepted work precedence over forfeit', () => {
    const g = game();
    g.forfeits = ['a'];
    g.cutoff = 200;
    g.submissions = [sub('a', 'a', 100, 'AC')];
    resolve(g, 300);
    expect(g.outcome?.winnerId).toBe('a');
  });
  it('draws when no one solves before deadline', () => {
    const g = game();
    resolve(g, 10000);
    expect(g.outcome?.winnerId).toBeNull();
    expect(g.outcome?.rated).toBe(true);
  });
  it('never changes a final result', () => {
    const g = game();
    g.submissions = [sub('a', 'a', 100, 'AC')];
    resolve(g, 300);
    g.submissions.push(sub('b', 'b', 50, 'AC'));
    resolve(g, 400);
    expect(g.outcome?.winnerId).toBe('a');
  });
  it('cancels an unanswered ready check', () => {
    const g = newGame('m', users, 'test', 0);
    advance(g, 20000);
    expect(g.phase).toBe('CANCELLED');
  });
  it('does not penalize both disconnected players with a loss', () => {
    const g = game();
    g.endsAt = 120000;
    advance(g, 30000);
    expect(g.phase).toBe('NO_CONTEST');
  });
  it('public run AC does not win a match', () => {
    const g = game();
    g.submissions = [{ ...sub('r', 'a', 10, 'AC'), kind: 'run' }];
    resolve(g, 100);
    expect(g.phase).toBe('ACTIVE');
  });
  it('a disconnect grace that expires after the deadline cannot turn a draw into a loss', () => {
    const g = game();
    g.players[0].lastSeen = 0;
    g.players[1].lastSeen = 20000;
    advance(g, 35000);
    expect(g.outcome?.winnerId).toBeNull();
    expect(g.outcome?.reason).toContain('Time expired');
  });
  it('always respects receipt ordering across completion permutations', () => {
    for (const order of [
      [0, 1],
      [1, 0],
    ]) {
      const g = game();
      g.submissions = [sub('a', 'a', 100, 'PENDING'), sub('b', 'b', 200, 'PENDING')];
      for (const i of order) {
        g.submissions[i].verdict = 'AC';
        resolve(g, 300 + i);
      }
      expect(g.outcome?.winnerId).toBe('a');
    }
  });
});
describe('ratings and queue', () => {
  it('conserves rating for wins, losses and draws', () => {
    for (let a = 700; a < 2200; a += 73)
      for (let b = 700; b < 2200; b += 97)
        for (const score of [0, 0.5, 1]) {
          const [x, y] = elo(a, b, score);
          expect(x + y).toBe(0);
          expect(Number.isInteger(x)).toBe(true);
        }
  });
  it('moves equal ratings by 16 for a win', () => expect(elo(1200, 1200, 1)).toEqual([16, -16]));
  it('uses both players widening windows', () => {
    expect(
      compatible({ rating: 1200, joinedAt: 0 }, { rating: 1450, joinedAt: 29000 }, 30000),
    ).toBe(false);
    expect(compatible({ rating: 1200, joinedAt: 0 }, { rating: 1450, joinedAt: 0 }, 30000)).toBe(
      true,
    );
  });
  it('uses deterministic rank boundaries', () => {
    expect(rank(1199)).toBe('Silver');
    expect(rank(1200)).toBe('Gold');
  });
});
describe('exact output comparison', () => {
  it('normalizes CRLF and one terminal newline only', () => {
    expect(normalizeOutput('1\r\n')).toBe('1');
    expect(normalizeOutput('1\n\n')).toBe('1\n');
    expect(normalizeOutput('1 ')).not.toBe('1');
  });
});
