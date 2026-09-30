export type Verdict = 'PENDING' | 'AC' | 'WA' | 'RE' | 'TLE' | 'MLE' | 'OLE' | 'JUDGE_ERROR';
export type Phase =
  'WAITING_READY' | 'COUNTDOWN' | 'ACTIVE' | 'RESOLVING' | 'FINISHED' | 'NO_CONTEST' | 'CANCELLED';
export type User = {
  id: string;
  username: string;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
  games_played: number;
  rating_version: number;
};
export type Player = User & { ready: boolean; lastSeen: number };
export type Submission = {
  id: string;
  userId: string;
  key: string;
  kind: 'run' | 'submit';
  source: string;
  sourceHash: string;
  receiptMs: number;
  seq: number;
  verdict: Verdict;
  attempt: number;
  leaseUntil?: number;
  output?: string;
  runtimeMs?: number;
  auditPending?: boolean;
};
export type Outcome = { winnerId: string | null; reason: string; rated: boolean };
export type Game = {
  id: string;
  players: [Player, Player];
  phase: Phase;
  createdAt: number;
  startedAt?: number;
  endsAt?: number;
  problemId: string;
  mode: 'ranked' | 'unrated' | 'casual';
  revision: number;
  submissions: Submission[];
  resolutionAt?: number;
  cutoff?: number;
  forfeits: string[];
  outcome?: Outcome;
  finishedAt?: number;
  settled: boolean;
  rematchVotes: string[];
  nextMatchId?: string;
};
export const RULES = {
  countdown: 3000,
  duration: 1_200_000,
  readyTimeout: 20_000,
  grace: 30_000,
  resolution: 60_000,
  queueTimeout: 120_000,
};
export const terminal = (g: Game) => ['FINISHED', 'NO_CONTEST', 'CANCELLED'].includes(g.phase);
export const rank = (rating: number) =>
  rating < 1000
    ? 'Bronze'
    : rating < 1200
      ? 'Silver'
      : rating < 1400
        ? 'Gold'
        : rating < 1600
          ? 'Platinum'
          : rating < 1800
            ? 'Diamond'
            : rating < 2000
              ? 'Master'
              : 'Grandmaster';
export function elo(a: number, b: number, score: number): [number, number] {
  const delta = Math.floor(32 * (score - 1 / (1 + 10 ** ((b - a) / 400))) + 0.5);
  return [delta, -delta];
}
export const ratingWindow = (waitMs: number) =>
  Math.min(400, 100 + Math.floor(Math.max(0, waitMs) / 10000) * 50);
export function compatible(
  a: { rating: number; joinedAt: number },
  b: { rating: number; joinedAt: number },
  now: number,
) {
  return (
    Math.abs(a.rating - b.rating) <=
    Math.min(ratingWindow(now - a.joinedAt), ratingWindow(now - b.joinedAt))
  );
}
export function normalizeOutput(output: string) {
  return output.replace(/\r\n/g, '\n').replace(/\n$/, '');
}
export function newGame(
  id: string,
  players: [User, User],
  problemId: string,
  now: number,
  mode: Game['mode'] = 'ranked',
): Game {
  return {
    id,
    players: players.map((p) => ({ ...p, ready: false, lastSeen: now })) as [Player, Player],
    problemId,
    mode,
    phase: 'WAITING_READY',
    createdAt: now,
    revision: 1,
    submissions: [],
    forfeits: [],
    settled: false,
    rematchVotes: [],
  };
}
export function finish(
  g: Game,
  now: number,
  winnerId: string | null,
  reason: string,
  phase: Phase = 'FINISHED',
) {
  if (terminal(g)) return;
  g.phase = phase;
  g.finishedAt = now;
  g.outcome = { winnerId, reason, rated: g.mode === 'ranked' && phase === 'FINISHED' };
  g.revision++;
}
export function resolve(g: Game, now: number) {
  if (terminal(g) || !['ACTIVE', 'RESOLVING'].includes(g.phase)) return;
  const subs = g.submissions.filter((s) => s.kind === 'submit');
  const accepted = subs
    .filter((s) => s.verdict === 'AC' && s.receiptMs <= (g.cutoff ?? Infinity))
    .sort((a, b) => a.receiptMs - b.receiptMs);
  const candidateTime = accepted[0]?.receiptMs;
  const deadline = now >= (g.endsAt ?? Infinity);
  if (candidateTime === undefined && !deadline && !g.forfeits.length && g.phase !== 'RESOLVING')
    return;
  g.resolutionAt ??= now;
  g.phase = 'RESOLVING';
  const cutoff = Math.min(
    candidateTime ?? Infinity,
    g.cutoff ?? Infinity,
    (g.endsAt ?? Infinity) - 1,
  );
  const unresolved = subs.some(
    (s) => s.receiptMs <= cutoff && ['PENDING', 'JUDGE_ERROR'].includes(s.verdict),
  );
  if (unresolved) {
    if (now >= g.resolutionAt + RULES.resolution)
      finish(g, now, null, 'Judge unavailable. No rating change.', 'NO_CONTEST');
    return;
  }
  if (candidateTime !== undefined) {
    const winners = new Set(
      accepted.filter((s) => s.receiptMs === candidateTime).map((s) => s.userId),
    );
    finish(
      g,
      now,
      winners.size === 1 ? accepted[0].userId : null,
      winners.size === 1 ? 'First accepted solution' : 'Accepted at the same time',
    );
  } else if (g.forfeits.length === 2)
    finish(g, now, null, 'Both players disconnected', 'NO_CONTEST');
  else if (g.forfeits.length === 1)
    finish(g, now, g.players.find((p) => p.id !== g.forfeits[0])!.id, 'Opponent forfeited');
  else if (deadline) finish(g, now, null, 'Time expired. Neither player solved the problem.');
}
export function advance(g: Game, now: number) {
  if (terminal(g)) return;
  if (g.phase === 'WAITING_READY' && now >= g.createdAt + RULES.readyTimeout)
    finish(g, now, null, 'Ready check expired', 'CANCELLED');
  if (g.phase === 'COUNTDOWN' && now >= g.startedAt!) {
    g.phase = 'ACTIVE';
    g.players.forEach((p) => (p.lastSeen = now));
    g.revision++;
  }
  if (['ACTIVE', 'RESOLVING'].includes(g.phase)) {
    const expired = g.players.filter(
      (p) => now >= p.lastSeen + RULES.grace && p.lastSeen + RULES.grace < (g.endsAt ?? Infinity),
    );
    if (expired.length) {
      g.cutoff ??= Math.min(...expired.map((p) => p.lastSeen + RULES.grace));
      g.forfeits = [...new Set([...g.forfeits, ...expired.map((p) => p.id)])];
    }
    resolve(g, now);
  }
}
