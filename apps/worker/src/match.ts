import { DurableObject } from 'cloudflare:workers';
import {
  advance,
  elo,
  finish,
  newGame,
  resolve,
  RULES,
  terminal,
  type Game,
  type Submission,
  type User,
  type Verdict,
} from '../../../packages/shared/game';
import {
  socketSchema,
  submissionSchema,
  type PublicProblem,
  type Snapshot,
} from '../../../packages/protocol';
import { ApiError, assert, body, hash, json, type Env } from './env';

export class MatchDO extends DurableObject<Env> {
  async fetch(req: Request): Promise<Response> {
    // Errors must be caught inside the callback: workerd does not route a rejected
    // blockConcurrencyWhile callback back to the awaiting request's try/catch.
    return this.ctx.blockConcurrencyWhile(async () => {
      try {
        return await this.handle(req);
      } catch (error) {
        if (error instanceof ApiError)
          return json({ code: error.code, message: error.message }, error.status);
        const requestId = crypto.randomUUID();
        console.error(
          JSON.stringify({
            event: 'match_request_failed',
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
  private async handle(req: Request): Promise<Response> {
    const path = new URL(req.url).pathname;
    let g = await this.ctx.storage.get<Game>('game');
    if (path === '/init') {
      if (!g) {
        const p = (await req.json()) as {
          id: string;
          players: [User, User];
          problemId: string;
          mode: Game['mode'];
        };
        g = newGame(p.id, p.players, p.problemId, Date.now(), p.mode);
        await this.problem(g);
        await this.save(g);
      }
      await this.env.DB.prepare(
        'INSERT OR IGNORE INTO matches(id,problem_id,mode,player_a,player_b,created_at) VALUES (?,?,?,?,?,?)',
      )
        .bind(g.id, g.problemId, g.mode, g.players[0].id, g.players[1].id, g.createdAt)
        .run();
      return json({ ok: true });
    }
    assert(g, 404, 'NOT_FOUND', 'Match not found.');
    if (path === '/internal') return json(g);
    if (path === '/rematch-created') {
      const { matchId } = (await req.json()) as { matchId: string };
      assert(
        terminal(g) && g.rematchVotes.length === 2,
        409,
        'REMATCH_CLOSED',
        'No agreed rematch.',
      );
      g.nextMatchId = matchId;
      await this.save(g);
      await this.broadcast(g);
      return json({ ok: true });
    }
    const uid = req.headers.get('X-Player');
    const player = g.players.find((p) => p.id === uid);
    assert(player, 403, 'FORBIDDEN', 'This match belongs to other players.');
    const now = Date.now();
    await this.tick(g, now);
    if (!terminal(g)) player.lastSeen = now;
    if (path === '/ws') {
      assert(
        req.headers.get('Upgrade')?.toLowerCase() === 'websocket',
        400,
        'INVALID_UPGRADE',
        'WebSocket required.',
      );
      // Cap sockets per participant; reconnect can replace an old tab without growing unboundedly.
      for (const old of this.ctx.getWebSockets(uid!)) old.close(4001, 'Reconnected in another tab');
      const pair = new WebSocketPair();
      const client = pair[0],
        server = pair[1];
      server.serializeAttachment({
        uid,
        sessionHash: req.headers.get('X-Session-Hash'),
        expiresAt: Math.min(now + 3600000, Number(req.headers.get('X-Session-Expires'))),
      });
      this.ctx.acceptWebSocket(server, [uid!]);
      await this.save(g);
      this.send(server, JSON.stringify(await this.envelope(g, uid!)));
      return new Response(null, { status: 101, webSocket: client });
    }
    if (path === '/ready') {
      if (g.phase === 'WAITING_READY') {
        player.ready = true;
        if (g.players.every((p) => p.ready)) {
          g.phase = 'COUNTDOWN';
          g.startedAt = now + RULES.countdown;
          g.endsAt = g.startedAt + RULES.duration;
        }
      }
    } else if (path === '/forfeit' && !terminal(g)) {
      if (['WAITING_READY', 'COUNTDOWN'].includes(g.phase))
        finish(g, now, null, 'Match cancelled before start', 'CANCELLED');
      else {
        g.forfeits = [...new Set([...g.forfeits, uid!])];
        g.cutoff ??= now;
        resolve(g, now);
      }
    } else if (path === '/claim') {
      assert(
        g.mode === 'casual' && this.env.CASUAL_WASM === 'true',
        403,
        'CASUAL_ONLY',
        'Browser completion is only available in casual matches.',
      );
      // Client reports are deliberately untrusted. They can end only an unrated casual match.
      if (!terminal(g)) {
        assert(
          g.phase === 'ACTIVE' && now < g.endsAt!,
          409,
          'MATCH_CLOSED',
          'This match is not accepting completion reports.',
        );
        finish(g, now, uid!, 'Browser-reported completion · unverified');
      }
    } else if (path === '/run' || path === '/submit') {
      assert(
        g.mode !== 'casual',
        403,
        'CASUAL_ONLY',
        'Use browser execution for this casual match.',
      );
      const parsed = submissionSchema.safeParse(await body(req));
      assert(
        parsed.success,
        400,
        'INVALID_SUBMISSION',
        'Provide Python source and problem version 1.',
      );
      assert(
        new TextEncoder().encode(parsed.data.source).length <= 65536,
        413,
        'TOO_LARGE',
        'Source must be at most 64 KiB.',
      );
      const key = req.headers.get('Idempotency-Key');
      assert(
        key && /^[\w-]{8,80}$/.test(key),
        400,
        'MISSING_KEY',
        'A submission request ID is required.',
      );
      const kind = path === '/run' ? 'run' : 'submit';
      const sourceHash = await hash(parsed.data.source);
      const duplicate = g.submissions.find((s) => s.userId === uid && s.key === key);
      if (duplicate) {
        assert(
          duplicate.sourceHash === sourceHash && duplicate.kind === kind,
          409,
          'KEY_REUSED',
          'Request ID already belongs to a different submission.',
        );
        return json({ submissionId: duplicate.id }, 202);
      }
      assert(
        g.phase === 'ACTIVE' && now < g.endsAt!,
        409,
        'MATCH_CLOSED',
        'This match is no longer accepting code.',
      );
      assert(
        this.env.JUDGE_ENABLED === 'true' && this.env.JUDGE,
        503,
        'JUDGE_UNAVAILABLE',
        'Python judging is not available yet. Your code is saved in this browser.',
      );
      const own = g.submissions.filter((s) => s.userId === uid);
      assert(
        !own.some((s) => s.verdict === 'PENDING'),
        429,
        'JOB_PENDING',
        'Wait for your current execution to finish.',
      );
      assert(
        own.filter((s) => s.kind === kind).length < (kind === 'run' ? 30 : 20),
        429,
        'LIMIT_REACHED',
        'Execution limit reached for this match.',
      );
      assert(
        !own.length || now - own[own.length - 1].receiptMs >= 2000,
        429,
        'TOO_FAST',
        'Wait two seconds before running again.',
      );
      const s: Submission = {
        id: crypto.randomUUID(),
        userId: uid!,
        key,
        kind,
        source: parsed.data.source,
        sourceHash,
        receiptMs: now,
        seq: g.submissions.length + 1,
        verdict: 'PENDING',
        attempt: 0,
      };
      // The room receipt, source and recovery alarm commit together. D1 is a retryable projection.
      s.auditPending = true;
      g.submissions.push(s);
      await this.save(g);
      await this.broadcast(g);
      return json({ submissionId: s.id, receiptMs: now }, 202);
    } else if (path === '/rematch') {
      assert(
        terminal(g) && g.settled && now - g.finishedAt! <= 30000,
        409,
        'REMATCH_CLOSED',
        'Rematch window has closed. Find a new match.',
      );
      g.rematchVotes = [...new Set([...g.rematchVotes, uid!])];
    }
    await this.persist(g);
    await this.broadcast(g);
    return json(await this.snapshot(g, uid!));
  }
  async snapshot(g: Game, uid: string): Promise<Snapshot> {
    let problem: PublicProblem | undefined;
    if (
      g.startedAt &&
      Date.now() >= g.startedAt &&
      !['WAITING_READY', 'COUNTDOWN', 'CANCELLED'].includes(g.phase)
    ) {
      const row = await this.problem(g);
      problem = row ? JSON.parse(row.public_json) : undefined;
    }
    return {
      id: g.id,
      phase: g.phase,
      createdAt: g.createdAt,
      startedAt: g.startedAt,
      endsAt: g.endsAt,
      mode: g.mode,
      revision: g.revision,
      forfeits: g.forfeits,
      resolutionAt: g.resolutionAt,
      cutoff: g.cutoff,
      outcome: g.outcome,
      finishedAt: g.finishedAt,
      settled: g.settled,
      rematchVotes: g.rematchVotes,
      nextMatchId: g.nextMatchId,
      serverTime: Date.now(),
      problem,
      players: g.players.map((p) => ({
        id: p.id,
        username: p.username,
        rating: p.rating,
        ready: p.ready,
        online: Date.now() - p.lastSeen < 15000,
      })),
      submissions: await Promise.all(
        g.submissions
          .filter((s) => s.userId === uid)
          .map(async (s) => ({
            id: s.id,
            kind: s.kind,
            receiptMs: s.receiptMs,
            verdict: s.verdict,
            runtimeMs: s.runtimeMs,
            ...(s.kind === 'run'
              ? { output: (await this.ctx.storage.get<string>('output:' + s.id))?.slice(0, 2048) }
              : {}),
          })),
      ),
    };
  }
  async envelope(g: Game, uid: string) {
    return {
      protocolVersion: 1,
      type: 'match.snapshot',
      matchId: g.id,
      seq: g.revision,
      serverTime: Date.now(),
      payload: await this.snapshot(g, uid),
    };
  }
  // A replaced or closing socket throws on send and would otherwise surface as an
  // uncaught error inside a hibernation event handler, so every send is guarded.
  private send(ws: WebSocket, payload: string) {
    if (ws.readyState !== WebSocket.OPEN) return;
    try {
      ws.send(payload);
    } catch {
      try {
        ws.close();
      } catch {
        /* already closed */
      }
    }
  }
  async broadcast(g: Game) {
    for (const ws of this.ctx.getWebSockets()) {
      const a = ws.deserializeAttachment() as {
        uid: string;
        expiresAt: number;
        sessionHash?: string;
      };
      const session =
        a.sessionHash &&
        a.expiresAt > Date.now() &&
        (await this.env.DB.prepare(
          'SELECT user_id FROM sessions WHERE token_hash=? AND user_id=? AND expires_at>?',
        )
          .bind(a.sessionHash, a.uid, Date.now())
          .first());
      if (!session) {
        ws.close(1008, 'Session refresh required');
        continue;
      }
      this.send(ws, JSON.stringify(await this.envelope(g, a.uid)));
    }
  }
  async problem(g: Game) {
    let row = await this.ctx.storage.get<{ public_json: string; private_json: string }>('problem');
    if (!row) {
      const current = await this.env.DB.prepare(
        'SELECT public_json,private_json FROM problems WHERE id=?',
      )
        .bind(g.problemId)
        .first<{ public_json: string; private_json: string }>();
      if (!current) throw new Error('Problem missing');
      row = current;
      await this.ctx.storage.put('problem', row);
    }
    return row;
  }
  async save(g: Game) {
    g.revision++;
    const now = Date.now();
    let next = Infinity;
    if (!terminal(g)) {
      if (g.phase === 'WAITING_READY') next = g.createdAt + RULES.readyTimeout;
      else if (g.phase === 'COUNTDOWN') next = g.startedAt!;
      else {
        // Past cutoffs must not create a 100 ms alarm loop while the judge is resolving.
        const deadlines = [g.endsAt!, ...g.players.map((p) => p.lastSeen + RULES.grace)].filter(
          (t) => t > now,
        );
        next = Math.min(...deadlines);
      }
      if (g.resolutionAt) next = Math.min(next, g.resolutionAt + RULES.resolution);
      if (g.submissions.some((s) => s.verdict === 'PENDING' || s.verdict === 'JUDGE_ERROR'))
        next = Math.min(next, now + 1000);
    } else if (!g.settled) next = now + 3000;
    if (g.submissions.some((s) => s.auditPending)) next = Math.min(next, now + 1000);
    if (terminal(g) && g.rematchVotes.length === 2 && !g.nextMatchId && now - g.finishedAt! < 60000)
      next = Math.min(next, now + 1000);
    await this.ctx.storage.transaction(async (tx) => {
      // Bounded records: a room may contain 100 sources and 60 example outputs.
      // Migrate inline payloads from older local rooms on their next save.
      for (const sub of g.submissions) {
        if (sub.source) await tx.put('source:' + sub.id, sub.source);
        if (sub.output !== undefined) await tx.put('output:' + sub.id, sub.output);
      }
      const stored = {
        ...g,
        submissions: g.submissions.map((sub) => ({ ...sub, source: '', output: undefined })),
      };
      await tx.put('game', stored);
      if (Number.isFinite(next)) await tx.setAlarm(Math.max(now + 100, next));
      else await tx.deleteAlarm();
    });
    for (const sub of g.submissions) {
      sub.source = '';
      delete sub.output;
    }
  }
  async project(g: Game) {
    for (const s of g.submissions.filter((s) => s.auditPending)) {
      const source = await this.ctx.storage.get<string>('source:' + s.id);
      if (source === undefined) throw new Error('Durable source missing');
      await this.env.DB.prepare(
        `INSERT INTO submissions(id,match_id,user_id,idempotency_key,kind,language,source,source_hash,receipt_ms,receipt_seq,job_id,attempt_token,verdict,runtime_ms,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET verdict=excluded.verdict,runtime_ms=excluded.runtime_ms,attempt_token=excluded.attempt_token`,
      )
        .bind(
          s.id,
          g.id,
          s.userId,
          s.key,
          s.kind,
          'python',
          source,
          s.sourceHash,
          s.receiptMs,
          s.seq,
          s.id,
          `${s.key}:${s.attempt}`,
          s.verdict,
          s.runtimeMs ?? null,
          s.receiptMs,
        )
        .run();
      s.auditPending = false;
    }
  }
  async persist(g: Game) {
    await this.save(g);
    if (terminal(g) && !g.settled) {
      try {
        await this.settle(g);
        await this.save(g);
      } catch {
        console.error(JSON.stringify({ event: 'settlement_retry', matchId: g.id }));
      }
    }
  }
  async settle(g: Game) {
    if (!terminal(g) || g.settled || !g.outcome) return;
    const [a, b] = g.players;
    const score = g.outcome.winnerId === null ? 0.5 : g.outcome.winnerId === a.id ? 1 : 0;
    const [delta] = elo(a.rating, b.rating, score);
    const digest = await hash(JSON.stringify(g.outcome));
    await this.env.DB.batch([
      this.env.DB.prepare(
        'INSERT INTO settlements VALUES (?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(match_id) DO NOTHING',
      ).bind(
        g.id,
        digest,
        g.outcome.rated ? 1 : 0,
        a.id,
        b.id,
        a.rating,
        b.rating,
        a.rating_version,
        b.rating_version,
        delta,
        score,
        g.finishedAt,
      ),
      this.env.DB.prepare('UPDATE matches SET finished_at=?,outcome_json=? WHERE id=?').bind(
        g.finishedAt,
        JSON.stringify(g.outcome),
        g.id,
      ),
    ]);
    const saved = await this.env.DB.prepare('SELECT digest FROM settlements WHERE match_id=?')
      .bind(g.id)
      .first<{ digest: string }>();
    if (saved?.digest !== digest) throw new Error('Settlement digest mismatch');
    g.settled = true;
  }
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    if (typeof message !== 'string' || message.length > 16384) {
      ws.close(1009, 'Frame too large');
      return;
    }
    let msg;
    try {
      msg = socketSchema.parse(JSON.parse(message));
    } catch {
      ws.close(1008, 'Invalid protocol');
      return;
    }
    const auth = ws.deserializeAttachment() as {
      uid: string;
      expiresAt: number;
      sessionHash: string;
    };
    if (auth.expiresAt < Date.now()) {
      ws.close(1008, 'Session expired');
      return;
    }
    await this.ctx.blockConcurrencyWhile(async () => {
      try {
        const session = await this.env.DB.prepare(
          'SELECT user_id FROM sessions WHERE token_hash=? AND user_id=? AND expires_at>?',
        )
          .bind(auth.sessionHash, auth.uid, Date.now())
          .first();
        if (!session) {
          ws.close(1008, 'Session expired');
          return;
        }
        const g = await this.ctx.storage.get<Game>('game');
        if (!g) return;
        await this.tick(g, Date.now());
        const p = g.players.find((p) => p.id === auth.uid);
        if (p && !terminal(g)) p.lastSeen = Date.now();
        if (!terminal(g) || !g.settled) await this.persist(g);
        this.send(ws, JSON.stringify(await this.envelope(g, auth.uid)));
      } catch (error) {
        console.error(
          JSON.stringify({
            event: 'socket_message_failed',
            error: error instanceof Error ? error.name : 'Unknown',
          }),
        );
      }
    });
  }
  async webSocketClose(ws: WebSocket) {
    try {
      ws.close();
    } catch {
      /* already closed */
    }
  }
  async webSocketError(ws: WebSocket) {
    try {
      ws.close();
    } catch {
      /* already closed */
    }
  }
  async alarm() {
    const dispatch: Submission[] = [];
    let rematchSource: string | undefined;
    await this.ctx.blockConcurrencyWhile(async () => {
      try {
        const g = await this.ctx.storage.get<Game>('game');
        if (!g) return;
        const now = Date.now();
        await this.tick(g, now);
        if (!terminal(g))
          for (const s of g.submissions) {
            if (
              (s.verdict === 'PENDING' || s.verdict === 'JUDGE_ERROR') &&
              (!s.leaseUntil || s.leaseUntil <= now) &&
              s.attempt < 2
            ) {
              s.attempt++;
              s.leaseUntil = now + 45000;
              s.verdict = 'PENDING';
              s.auditPending = true;
              dispatch.push({ ...s });
            } else if (s.verdict === 'PENDING' && s.leaseUntil! <= now && s.attempt >= 2) {
              s.verdict = 'JUDGE_ERROR';
              s.auditPending = true;
              resolve(g, now);
            }
          }
        await this.save(g);
        try {
          await this.project(g);
        } catch {
          console.error(JSON.stringify({ event: 'submission_projection_retry', matchId: g.id }));
        }
        if (terminal(g) && g.rematchVotes.length === 2 && !g.nextMatchId) rematchSource = g.id;
        try {
          await this.settle(g);
        } catch {
          console.error(JSON.stringify({ event: 'settlement_retry', matchId: g.id }));
        }
        await this.save(g);
        await this.broadcast(g);
      } catch (error) {
        console.error(
          JSON.stringify({
            event: 'alarm_failed',
            error: error instanceof Error ? error.name : 'Unknown',
          }),
        );
        await this.ctx.storage.setAlarm(Date.now() + 3000);
      }
    });
    // Never await the matchmaker while holding this room's gate: pairing may need
    // to read this room before releasing its own gate.
    if (rematchSource) this.ctx.waitUntil(this.recoverRematch(rematchSource));
    for (const s of dispatch) this.ctx.waitUntil(this.execute(s));
  }
  async recoverRematch(sourceMatchId: string) {
    try {
      const response = await this.env.MATCHMAKER.get(this.env.MATCHMAKER.idFromName('alpha')).fetch(
        'https://queue',
        { method: 'POST', body: JSON.stringify({ action: 'rematch-status', sourceMatchId }) },
      );
      if (!response.ok) return;
      const { matchId } = (await response.json()) as { matchId?: string };
      if (!matchId) return;
      await this.ctx.blockConcurrencyWhile(async () => {
        try {
          const g = await this.ctx.storage.get<Game>('game');
          if (g && !g.nextMatchId) {
            g.nextMatchId = matchId;
            await this.save(g);
            await this.broadcast(g);
          }
        } catch {
          await this.ctx.storage.setAlarm(Date.now() + 3000);
        }
      });
    } catch {
      console.error(
        JSON.stringify({ event: 'rematch_notification_retry', matchId: sourceMatchId }),
      );
    }
  }
  async tick(g: Game, now: number) {
    if (g.phase === 'COUNTDOWN' && now >= g.startedAt!)
      await this.env.DB.batch(
        g.players.map((p) =>
          this.env.DB.prepare('INSERT OR IGNORE INTO exposure VALUES (?,?,?)').bind(
            p.id,
            g.problemId,
            now,
          ),
        ),
      );
    advance(g, now);
  }
  async execute(s: Submission) {
    let result: { verdict: Verdict; output?: string; runtimeMs?: number } = {
      verdict: 'JUDGE_ERROR',
    };
    try {
      const g = (await this.ctx.storage.get<Game>('game'))!;
      const row = await this.problem(g);
      const source = await this.ctx.storage.get<string>('source:' + s.id);
      if (source === undefined) throw new Error('Source missing');
      const tests =
        s.kind === 'run' ? JSON.parse(row!.public_json).examples : JSON.parse(row!.private_json);
      const response = await this.env.JUDGE!.fetch('https://judge/execute', {
        method: 'POST',
        body: JSON.stringify({ id: s.id, attempt: s.attempt, source, tests, kind: s.kind }),
        signal: AbortSignal.timeout(44000),
      });
      if (response.ok) {
        const payload = (await response.json()) as typeof result;
        if (['AC', 'WA', 'RE', 'TLE', 'MLE', 'OLE', 'JUDGE_ERROR'].includes(payload.verdict))
          result = payload;
      }
    } catch {
      /* Fail closed as infrastructure error; never substitute a contestant verdict. */
    }
    await this.ctx.blockConcurrencyWhile(async () => {
      try {
        const g = await this.ctx.storage.get<Game>('game');
        if (!g || terminal(g)) return;
        const current = g.submissions.find((x) => x.id === s.id);
        if (!current || current.attempt !== s.attempt || current.verdict !== 'PENDING') return;
        current.verdict = result.verdict;
        current.runtimeMs = result.runtimeMs;
        current.auditPending = true;
        if (current.kind === 'run') current.output = result.output?.slice(0, 65536);
        current.leaseUntil = Date.now() + 3000;
        resolve(g, Date.now());
        await this.persist(g);
        await this.broadcast(g);
      } catch (error) {
        console.error(
          JSON.stringify({
            event: 'verdict_commit_failed',
            submissionId: s.id,
            error: error instanceof Error ? error.name : 'Unknown',
          }),
        );
      }
    });
  }
}
