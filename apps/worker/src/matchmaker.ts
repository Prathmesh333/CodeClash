import { DurableObject } from 'cloudflare:workers';
import { compatible, terminal, type User, type Game } from '../../../packages/shared/game';
import { ApiError, json, type Env } from './env';
type Ticket = {
  user: User;
  joinedAt: number;
  heartbeat: number;
  matchId?: string;
  problemId?: string;
  mode?: string;
};
export class MatchmakerDO extends DurableObject<Env> {
  async fetch(req: Request) {
    // Errors must be caught inside the callback: workerd does not route a rejected
    // blockConcurrencyWhile callback back to the awaiting request's try/catch.
    return this.ctx.blockConcurrencyWhile(async () => {
      try {
        return await this.queue(req);
      } catch (error) {
        if (error instanceof ApiError)
          return json({ code: error.code, message: error.message }, error.status);
        const requestId = crypto.randomUUID();
        console.error(
          JSON.stringify({
            event: 'queue_request_failed',
            requestId,
            error: error instanceof Error ? error.name : 'Unknown',
          }),
        );
        return json(
          { code: 'INTERNAL', message: 'Something went wrong. Please try again.', requestId },
          500,
        );
      }
    });
  }
  private async queue(req: Request) {
    const { action, user, players, sourceMatchId } = (await req.json()) as {
      action: string;
      user: User;
      players?: [User, User];
      sourceMatchId?: string;
    };
    const tickets = (await this.ctx.storage.get<Record<string, Ticket>>('tickets')) ?? {};
    if (action === 'rematch-status' && sourceMatchId)
      return json({ matchId: await this.ctx.storage.get<string>('rematch:' + sourceMatchId) });
    if (action === 'rematch' && players && sourceMatchId) {
      const existing = await this.ctx.storage.get<string>('rematch:' + sourceMatchId);
      if (existing) {
        await this.recover(tickets, existing);
        return json({ matchId: existing });
      }
      for (const p of players) {
        const t = tickets[p.id];
        if (t?.matchId) {
          const r = await this.env.MATCHES.get(this.env.MATCHES.idFromName(t.matchId)).fetch(
            'https://room/internal',
          );
          const g = (await r.json()) as Game;
          if (!terminal(g) || !g.settled)
            return json({ code: 'BUSY', message: 'A player is already in a match.' }, 409);
        } else if (t) return json({ code: 'BUSY', message: 'A player is already queued.' }, 409);
      }
      const id = crypto.randomUUID();
      const problem = await this.pickProblem(
        players[0].id,
        players[1].id,
        (players[0].rating + players[1].rating) / 2,
      );
      if (!problem)
        return json(
          { code: 'NO_PROBLEM', message: 'No unseen problems remain for this pair.' },
          409,
        );
      for (const p of players)
        tickets[p.id] = {
          user: p,
          joinedAt: Date.now(),
          heartbeat: Date.now(),
          matchId: id,
          problemId: problem,
          mode: 'unrated',
        };
      await this.ctx.storage.put({ tickets: tickets, ['rematch:' + sourceMatchId]: id });
      await this.ctx.storage.setAlarm(Date.now() + 1000);
      await this.create(id, players, problem, 'unrated');
      return json({ matchId: id });
    }
    const previous = tickets[user.id];
    if (previous?.matchId) {
      await this.recover(tickets, previous.matchId);
      const res = await this.env.MATCHES.get(this.env.MATCHES.idFromName(previous.matchId)).fetch(
        'https://room/internal',
      );
      const game = (await res.json()) as Game;
      if (!terminal(game) || !game.settled)
        return json({ state: 'MATCHED', matchId: previous.matchId });
      delete tickets[user.id];
    }
    const now = Date.now();
    for (const [id, t] of Object.entries(tickets))
      if (!t.matchId && (now - t.heartbeat > 30000 || now - t.joinedAt >= 120000))
        delete tickets[id];
    if (action === 'leave') delete tickets[user.id];
    if (action === 'join' && !tickets[user.id])
      tickets[user.id] = { user, joinedAt: now, heartbeat: now };
    if (tickets[user.id]) tickets[user.id].heartbeat = now;
    // Persist membership before any external room creation. Recovery reuses its ID.
    await this.ctx.storage.put('tickets', tickets);
    const waiting = Object.values(tickets)
      .filter((t) => !t.matchId)
      .sort((a, b) => a.joinedAt - b.joinedAt);
    for (let i = 0; i < waiting.length; i++) {
      const a = waiting[i];
      if (a.matchId) continue;
      for (let j = i + 1; j < waiting.length; j++) {
        const b = waiting[j];
        if (
          b.matchId ||
          !compatible(
            { rating: a.user.rating, joinedAt: a.joinedAt },
            { rating: b.user.rating, joinedAt: b.joinedAt },
            now,
          )
        )
          continue;
        const recent = await this.env.DB.prepare(
          'SELECT id FROM matches WHERE created_at>? AND ((player_a=? AND player_b=?) OR (player_a=? AND player_b=?)) LIMIT 1',
        )
          .bind(now - 300000, a.user.id, b.user.id, b.user.id, a.user.id)
          .first();
        if (recent) continue;
        const problem = await this.pickProblem(
          a.user.id,
          b.user.id,
          (a.user.rating + b.user.rating) / 2,
        );
        if (!problem) continue;
        const id = crypto.randomUUID();
        a.matchId = id;
        b.matchId = id;
        a.problemId = problem;
        b.problemId = problem;
        await this.ctx.storage.put('tickets', tickets);
        await this.create(id, [a.user, b.user], problem, 'ranked');
        break;
      }
    }
    await this.ctx.storage.put('tickets', tickets);
    await this.ctx.storage.setAlarm(now + 10000);
    const ticket = tickets[user.id];
    return json(
      ticket?.matchId
        ? { state: 'MATCHED', matchId: ticket.matchId }
        : ticket
          ? {
              state: 'QUEUED',
              joinedAt: ticket.joinedAt,
              waiting: Object.values(tickets).filter((t) => !t.matchId).length,
            }
          : { state: 'IDLE' },
    );
  }
  async pickProblem(a: string, b: string, rating: number) {
    const p = await this.env.DB.prepare(
      "SELECT id FROM problems WHERE status='active' AND id NOT IN (SELECT problem_id FROM exposure WHERE user_id IN (?,?)) ORDER BY CASE WHEN json_extract(public_json, '$.difficulty')=? THEN 0 ELSE 1 END, RANDOM() LIMIT 1",
    )
      .bind(a, b, rating < 1400 ? 'Easy' : 'Medium')
      .first<{ id: string }>();
    return p?.id;
  }
  async create(id: string, players: [User, User], problemId: string, mode: string) {
    const r = await this.env.MATCHES.get(this.env.MATCHES.idFromName(id)).fetch(
      'https://room/init',
      { method: 'POST', body: JSON.stringify({ id, players, problemId, mode }) },
    );
    if (!r.ok) throw new Error('Room initialization failed');
  }
  async recover(tickets: Record<string, Ticket>, id: string) {
    const pair = Object.values(tickets).filter((t) => t.matchId === id);
    if (pair.length === 2)
      await this.create(
        id,
        [pair[0].user, pair[1].user],
        pair[0].problemId!,
        pair[0].mode ?? 'ranked',
      );
  }
  async alarm() {
    await this.ctx.blockConcurrencyWhile(async () => {
      // Catch inside the callback: a rejected gate never reaches an awaiting try/catch.
      try {
        const tickets = (await this.ctx.storage.get<Record<string, Ticket>>('tickets')) ?? {};
        const now = Date.now();
        for (const [id, t] of Object.entries(tickets)) {
          if (!t.matchId && (now - t.heartbeat > 30000 || now - t.joinedAt >= 120000))
            delete tickets[id];
          if (t.matchId) {
            await this.recover(tickets, t.matchId);
            const response = await this.env.MATCHES.get(
              this.env.MATCHES.idFromName(t.matchId),
            ).fetch('https://room/internal');
            const g = (await response.json()) as Game;
            if (terminal(g) && g.settled) delete tickets[id];
          }
        }
        await this.ctx.storage.put('tickets', tickets);
        if (Object.keys(tickets).length) await this.ctx.storage.setAlarm(now + 10000);
      } catch (error) {
        console.error(
          JSON.stringify({
            event: 'queue_alarm_failed',
            error: error instanceof Error ? error.name : 'Unknown',
          }),
        );
        await this.ctx.storage.setAlarm(Date.now() + 3000);
      }
    });
  }
}
