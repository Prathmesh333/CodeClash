import Home from './Home';
import { usePythonRun, PythonResults } from './python/usePythonRun';
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import type { User } from '../../../packages/shared/game';
import { rank } from '../../../packages/shared/game';
import type { Snapshot } from '../../../packages/protocol';
import { api } from './api';
const CodeEditor = lazy(() => import('./CodeEditor'));
type Health = { local: boolean; judge: string; github?: boolean; casual?: boolean };
type Queue = {
  state: 'IDLE' | 'QUEUED' | 'MATCHED';
  joinedAt?: number;
  waiting?: number;
  matchId?: string;
};
type History = {
  id: string;
  problemTitle: string;
  mode: string;
  finished_at: number;
  outcome_json: string;
};
type Page = 'arena' | 'leaderboard' | 'history';
const icons = {
  arena: (
    <>
      <path d="m5 3 16 16-2 2L3 5zM15 3l6 2-7 7M3 21l7-7M3 15l6 6" />
    </>
  ),
  leaderboard: (
    <>
      <path d="M4 21V12h5v9M10 21V4h5v17M16 21v-6h5v6" />
    </>
  ),
  history: (
    <>
      <path d="M3 10a9 9 0 1 1 1 8M3 4v6h6M12 7v6l4 2" />
    </>
  ),
  arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
  code: (
    <>
      <path d="m8 6-6 6 6 6m8-12 6 6-6 6m-3-15-2 18" />
    </>
  ),
  check: <path d="m5 12 4 4L20 5" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
};
function Icon({ name }: { name: keyof typeof icons }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {icons[name]}
    </svg>
  );
}
function Mark() {
  return <img src="/brand/logo/codeclash-mark.svg" width="40" height="44" alt="" />;
}
function RankBadge({ small = false }: { small?: boolean }) {
  return (
    <div className={'rank-badge ' + (small ? 'small' : '')} aria-hidden="true">
      <svg viewBox="0 0 120 140">
        <path
          d="M60 7 108 35v57l-48 40-48-40V35z"
          fill="#262d20"
          stroke="#b8cc75"
          strokeWidth="1"
        />
        <path d="m60 23 33 21v39l-33 29-33-29V44z" fill="#c4de83" />
        <path d="m60 23 33 21-33 18-33-18z" fill="#e2f3b5" />
        <path d="M60 62v50L27 83V44z" fill="#839757" />
        <path d="m43 76 17-25 17 25-17 19z" fill="#202b1b" />
        <path d="m46 79 14-22 14 22-14-8z" fill="#e1f4ab" />
      </svg>
    </div>
  );
}
export default function App() {
  const [user, setUser] = useState<User | null>(null),
    [health, setHealth] = useState<Health | null>(null),
    [page, setPage] = useState<Page>('arena');
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [login, setLogin] = useState(false),
    [busy, setBusy] = useState(false);
  const [queue, setQueue] = useState<Queue>({ state: 'IDLE' }),
    [matchId, setMatchId] = useState<string | null>(sessionStorage.getItem('matchId'));
  const [players, setPlayers] = useState<User[]>([]),
    [history, setHistory] = useState<History[]>([]);
  const refresh = useCallback(async () => {
    const { user: u } = await api<{ user: User | null }>('/me');
    setUser(u);
    return u;
  }, []);
  useEffect(() => {
    Promise.all([refresh(), api<Health>('/health').then(setHealth)])
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [refresh]);
  useEffect(() => {
    if (matchId) sessionStorage.setItem('matchId', matchId);
    else sessionStorage.removeItem('matchId');
  }, [matchId]);
  // Queue state only needs polling while queued or idle; an in-progress match is driven by its
  // room socket, so polling then would add load and could re-assert a stale ticket.
  useEffect(() => {
    if (!user || matchId || busy) return;
    let cancelled = false,
      timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    const poll = async () => {
      try {
        const q = await api<Queue>('/matchmaking/status', undefined, undefined, controller.signal);
        if (cancelled) return;
        setQueue(q);
        if (q.matchId) setMatchId(q.matchId);
        else if (q.state === 'QUEUED') timer = setTimeout(poll, 3000);
      } catch (e) {
        if (!cancelled) {
          setError((e as Error).message);
          timer = setTimeout(poll, 3000);
        }
      }
    };
    void poll();
    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [user?.id, matchId, busy, queue.state]);
  useEffect(() => {
    if (page === 'leaderboard' || page === 'arena')
      api<{ players: User[] }>('/leaderboard')
        .then((r) => setPlayers(r.players))
        .catch((e) => setError(e.message));
    if (page === 'history' && user)
      api<{ matches: History[] }>('/matches')
        .then((r) => setHistory(r.matches))
        .catch((e) => setError(e.message));
  }, [page, user?.id]);
  async function action(fn: () => Promise<unknown>) {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }
  function join() {
    if (!user) {
      setLogin(true);
      return;
    }
    setPage('arena');
    void action(async () => {
      setMatchId(null);
      const q = await api<Queue>('/matchmaking/join', {});
      setQueue(q);
      if (q.matchId) setMatchId(q.matchId);
    });
  }
  function clearDrafts() {
    for (const key of Object.keys(localStorage))
      if (key.startsWith('rdsa:')) localStorage.removeItem(key);
  }
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="cc-header">
        <a
          className="cc-brand"
          href="#"
          aria-label="CodeClash home"
          onClick={(e) => {
            e.preventDefault();
            setPage('arena');
          }}
        >
          <img src="/brand/logo/codeclash-wordmark.svg" alt="CodeClash" />
        </a>
        <nav aria-label="Main navigation">
          {(['arena', 'leaderboard', 'history'] as Page[]).map((p) => (
            <button
              key={p}
              aria-current={page === p ? 'page' : undefined}
              className={page === p ? 'active' : ''}
              onClick={() => setPage(p)}
            >
              {p === 'arena' ? 'The arena' : p === 'history' ? 'Match history' : 'Leaderboard'}
            </button>
          ))}
        </nav>
        <div className="topbar-right">
          <span className="language-pill">
            <span className="python-dot" />
            Python only
          </span>
          {user ? (
            <button
              className="account-button"
              onClick={() =>
                void action(async () => {
                  await api('/auth/logout', {});
                  clearDrafts();
                  setUser(null);
                  setMatchId(null);
                  setQueue({ state: 'IDLE' });
                })
              }
              title="Sign out"
            >
              <span className="avatar">{user.username.slice(0, 2).toUpperCase()}</span>
              <span>{user.username}</span>
              <span className="logout-label">Sign out</span>
            </button>
          ) : (
            <button className="button small secondary" onClick={() => setLogin(true)}>
              Sign in <Icon name="arrow" />
            </button>
          )}
        </div>
      </header>
      <div className="main-shell">
        <main
          id="main"
          className={matchId && page === 'arena' ? 'main-content in-match' : 'main-content'}
        >
          {error && (
            <div className="error-banner" role="alert">
              {error}
              <button aria-label="Dismiss error" onClick={() => setError('')}>
                ×
              </button>
            </div>
          )}
          {!loading && matchId && user && (
            <div hidden={page !== 'arena'}>
              <MatchView
                key={matchId}
                id={matchId}
                user={user}
                health={health}
                onError={setError}
                onLeave={() => {
                  setMatchId(null);
                  void refresh();
                }}
                onNext={setMatchId}
                onSettled={() => void refresh()}
              />
            </div>
          )}
          {loading ? (
            <div className="empty-state">
              <span className="spinner" />
              Connecting to the arena…
            </div>
          ) : page === 'arena' ? (
            matchId && user ? null : (
              <>
                <Home
                  user={user}
                  players={players}
                  casual={health?.casual ?? false}
                  unavailable={
                    !!health && !health.local && !health.casual && health.judge !== 'configured'
                  }
                  busy={busy}
                  queued={queue.state === 'QUEUED'}
                  join={join}
                  navigate={setPage}
                />
                {queue.state === 'QUEUED' && (
                  <QueueCard
                    queue={queue}
                    cancel={() =>
                      void action(async () => setQueue(await api<Queue>('/matchmaking/leave', {})))
                    }
                  />
                )}
                {health?.judge === 'unavailable' && (
                  <div className="setup-note">
                    <Icon name="code" />
                    <span>
                      {health.casual ? (
                        <>
                          <strong>Casual beta.</strong> Python runs in your browser. Completion uses
                          public examples and is unverified. No rating changes.
                        </>
                      ) : health.local ? (
                        <>
                          <strong>Local setup in progress.</strong> Matchmaking and the coding room
                          are available. Run uses Python on your device; ranked Submit needs the
                          server judge.
                        </>
                      ) : (
                        <>
                          <strong>Staging preview.</strong> Ranked matches will open after judging
                          is verified.{' '}
                          {health.github
                            ? 'You can sign in and create your account now.'
                            : 'Account sign-in is being connected.'}
                        </>
                      )}
                    </span>
                  </div>
                )}
              </>
            )
          ) : page === 'leaderboard' ? (
            <>
              <div className="page-eyebrow">THE CLIMB</div>
              <h1 className="page-title">Earned, line by line.</h1>
              <p className="page-intro">
                The ranked ladder. Every result comes from a completed duel.
              </p>
              <div className="table-card">
                <table>
                  <thead>
                    <tr>
                      <th>Position</th>
                      <th>Player</th>
                      <th>Rank</th>
                      <th>MMR</th>
                      <th>Wins</th>
                    </tr>
                  </thead>
                  <tbody>
                    {players.map((p, i) => (
                      <tr key={p.id} className={p.id === user?.id ? 'you-row' : ''}>
                        <td className="position">{String(i + 1).padStart(2, '0')}</td>
                        <td>
                          <span className="avatar inline">
                            {p.username.slice(0, 2).toUpperCase()}
                          </span>
                          {p.username}
                          {p.id === user?.id && <span className="you-tag">YOU</span>}
                        </td>
                        <td>{rank(p.rating)}</td>
                        <td className="rating-cell">{p.rating}</td>
                        <td>{p.wins}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!players.length && (
                  <div className="empty-state">The ladder is waiting for its first players.</div>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="page-eyebrow">YOUR RECORD</div>
              <h1 className="page-title">Every duel tells a story.</h1>
              <p className="page-intro">Your completed matches and their final outcomes.</p>
              {!user ? (
                <div className="empty-state">
                  <Icon name="history" />
                  <h2>Your history starts with you.</h2>
                  <button className="button primary" onClick={() => setLogin(true)}>
                    Sign in
                  </button>
                </div>
              ) : !history.length ? (
                <div className="empty-state">
                  <Icon name="arena" />
                  <h2>A clean slate.</h2>
                  <p>Play your first match to start building your record.</p>
                  <button className="button primary" onClick={join}>
                    Enter the arena <Icon name="arrow" />
                  </button>
                </div>
              ) : (
                <div className="history-list">
                  {history.map((h) => {
                    const outcome = JSON.parse(h.outcome_json);
                    return (
                      <button
                        className="history-row"
                        key={h.id}
                        onClick={() => {
                          setMatchId(h.id);
                          setPage('arena');
                        }}
                      >
                        <span
                          className={'result-label ' + (outcome.winnerId === user.id ? 'win' : '')}
                        >
                          {!outcome.rated && h.mode === 'ranked'
                            ? 'No contest'
                            : outcome.winnerId === null
                              ? 'Draw'
                              : outcome.winnerId === user.id
                                ? 'Victory'
                                : 'Defeat'}
                        </span>
                        <div>
                          <strong>{h.problemTitle}</strong>
                          <span>
                            {h.mode} · {new Date(h.finished_at).toLocaleDateString()}
                          </span>
                        </div>
                        <Icon name="arrow" />
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </main>
      </div>
      {login && (
        <LoginModal
          githubReady={health?.github === true}
          local={health?.local ?? false}
          busy={busy}
          close={() => setLogin(false)}
          choose={(id) =>
            void action(async () => {
              await api('/auth/local', { id });
              await refresh();
              setLogin(false);
            })
          }
        />
      )}
    </div>
  );
}
function Stat({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value}</strong>
      <span className="stat-detail">{detail}</span>
    </div>
  );
}
function Step({
  n,
  icon,
  title,
  text,
}: {
  n: string;
  icon: keyof typeof icons;
  title: string;
  text: string;
}) {
  return (
    <article className="step">
      <div className="step-top">
        <span>{n}</span>
        <Icon name={icon} />
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}
function QueueCard({ queue, cancel }: { queue: Queue; cancel: () => void }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <section className="queue-card" aria-live="polite">
      <span className="radar" />
      <div>
        <strong>Looking for your next opponent</strong>
        <p>
          Matching near your rating · {Math.floor((now - (queue.joinedAt ?? now)) / 1000)}s ·{' '}
          {queue.waiting ?? 1} in queue
        </p>
      </div>
      <button className="button secondary" onClick={cancel}>
        Cancel search
      </button>
    </section>
  );
}
function LoginModal({
  githubReady,
  local,
  busy,
  close,
  choose,
}: {
  local: boolean;
  githubReady: boolean;
  busy: boolean;
  close: () => void;
  choose: (id: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog ref={dialog} className="login-dialog" onCancel={close}>
      <button className="dialog-close" onClick={close} aria-label="Close sign in">
        ×
      </button>
      <Mark />
      <h2>Your next rival is waiting.</h2>
      <p>
        {local
          ? 'Choose a local player. Use a separate browser profile for your opponent.'
          : 'Sign in to find your first opponent and start your climb.'}
      </p>
      {local ? (
        <div className="demo-players">
          {[
            ['alice', 'AdaByte'],
            ['bob', 'LoopRunner'],
            ['cora', 'StackSmith'],
            ['dan', 'BitWalker'],
          ].map(([id, name]) => (
            <button disabled={busy} key={id} onClick={() => choose(id)}>
              <span className="avatar">{name.slice(0, 2).toUpperCase()}</span>
              <span>{name}</span>
              <Icon name="arrow" />
            </button>
          ))}
        </div>
      ) : githubReady ? (
        <a className="button primary" href="/api/auth/github">
          Continue with GitHub <Icon name="arrow" />
        </a>
      ) : (
        <p role="status">GitHub sign-in is being connected. Please check back shortly.</p>
      )}
      <span className="dialog-footnote">
        {local
          ? 'Demo accounts stay on your local development instance.'
          : 'By playing ranked, you agree to compete without outside AI assistance.'}
      </span>
    </dialog>
  );
}
function MatchView({
  id,
  user,
  health,
  onError,
  onLeave,
  onNext,
  onSettled,
}: {
  id: string;
  user: User;
  health: Health | null;
  onError: (e: string) => void;
  onLeave: () => void;
  onNext: (id: string) => void;
  onSettled: () => void;
}) {
  const [game, setGame] = useState<Snapshot | null>(null),
    [connected, setConnected] = useState(false),
    [busy, setBusy] = useState(false),
    [tab, setTab] = useState('problem');
  const [source, setSource] = useState(localStorage.getItem(`rdsa:${user.id}:${id}`) ?? ''),
    [now, setNow] = useState(Date.now());
  const offset = useRef(0),
    lastRevision = useRef(-1),
    settled = useRef(false),
    receivedProblem = useRef(false),
    requestKey = useRef<{ fingerprint: string; key: string } | null>(null);
  const accept = useCallback(
    (g: Snapshot) => {
      if (g.revision < lastRevision.current) return;
      lastRevision.current = g.revision;
      offset.current = g.serverTime - Date.now();
      if (
        g.nextMatchId &&
        g.rematchVotes.includes(user.id) &&
        g.serverTime - (g.finishedAt ?? 0) < 60000
      ) {
        onNext(g.nextMatchId);
        return;
      }
      setGame(g);
      if (g.settled && !settled.current) {
        settled.current = true;
        onSettled();
      }
    },
    [onSettled, onNext, user.id],
  );
  const acceptRef = useRef(accept);
  acceptRef.current = accept;
  useEffect(() => {
    let stop = false,
      ws: WebSocket | undefined,
      retry: ReturnType<typeof setTimeout>,
      attempt = 0,
      pingSentAt = 0;
    // The room socket delivers the authoritative snapshot on connect, so the HTTP snapshot is only a
    // fallback: requesting it in the happy path doubles Durable Object traffic for no new state.
    const resync = () => {
      if (stop || lastRevision.current >= 0) return;
      api<Snapshot>(`/match/${id}`)
        .then((g) => acceptRef.current(g))
        .catch((e) => onError(e.message));
    };
    const fallback = setTimeout(resync, 3000);
    const connect = () => {
      if (stop) return;
      ws = new WebSocket(
        `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/api/match/${id}/ws`,
      );
      ws.onopen = () => {
        attempt = 0;
        setConnected(true);
        pingSentAt = 0;
      };
      ws.onmessage = (e) => {
        try {
          pingSentAt = 0;
          const msg = JSON.parse(e.data);
          if (msg.type === 'match.snapshot') {
            acceptRef.current(msg.payload);
            clearTimeout(fallback);
          }
        } catch {
          /* A malformed frame cannot change authoritative UI state. */
        }
      };
      ws.onclose = (e) => {
        setConnected(false);
        if (e.code === 4001) {
          stop = true;
          onError('This match is open in another tab. Reload here to reconnect.');
          return;
        }
        resync();
        if (!stop)
          retry = setTimeout(connect, Math.min(10000, 500 * 2 ** attempt++) + Math.random() * 200);
      };
      ws.onerror = () => ws?.close();
    };
    connect();
    const heartbeat = setInterval(() => {
      if (ws?.readyState !== WebSocket.OPEN) return;
      if (pingSentAt) {
        if (Date.now() - pingSentAt > 15000) ws.close();
        return;
      }
      pingSentAt = Date.now();
      ws.send(JSON.stringify({ protocolVersion: 1, type: 'client.ping' }));
    }, 5000);
    const timer = setInterval(() => setNow(Date.now() + offset.current), 250);
    return () => {
      stop = true;
      clearTimeout(retry);
      clearTimeout(fallback);
      clearInterval(heartbeat);
      clearInterval(timer);
      ws?.close();
    };
  }, [id]);
  useEffect(() => {
    if (game?.problem && !receivedProblem.current) {
      receivedProblem.current = true;
      setSource((current) => current || game.problem!.starterCode);
    }
  }, [game?.problem]);
  useEffect(() => {
    if (source) localStorage.setItem(`rdsa:${user.id}:${id}`, source);
  }, [source, id, user.id]);
  async function mutate(action: string, data: unknown = {}) {
    setBusy(true);
    onError('');
    try {
      const g = await api<Snapshot & { matchId?: string }>(`/match/${id}/${action}`, data);
      if (g.matchId) onNext(g.matchId);
      else if (g.id) acceptRef.current(g);
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const localRun = usePythonRun();
  async function completeCasual() {
    if (!game?.problem || busy || localRun.status) return;
    setBusy(true);
    onError('');
    setTab('results');
    try {
      const results = await localRun.run(source, game.problem.examples);
      if (results?.length && results.every((result) => result.verdict === 'PASS')) {
        await mutate('claim');
      } else onError('Pass every public example before reporting completion.');
    } finally {
      setBusy(false);
    }
  }
  async function execute(kind: 'submit') {
    setBusy(true);
    onError('');
    const fingerprint = kind + source;
    if (requestKey.current?.fingerprint !== fingerprint)
      requestKey.current = {
        fingerprint,
        key: Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
          byte.toString(16).padStart(2, '0'),
        ).join(''),
      };
    try {
      await api(
        `/match/${id}/${kind}`,
        { language: 'python', source, problemVersion: 1 },
        requestKey.current.key,
      );
      requestKey.current = null;
      setTab('results');
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!game)
    return (
      <div className="empty-state">
        <span className="spinner" />
        Joining your match…
        <button className="button secondary" onClick={onLeave}>
          Back to arena
        </button>
      </div>
    );
  const me = game.players.find((p) => p.id === user.id)!,
    opponent = game.players.find((p) => p.id !== user.id)!;
  const done = ['FINISHED', 'CANCELLED', 'NO_CONTEST'].includes(game.phase),
    seconds = Math.max(0, Math.ceil(((game.endsAt ?? now) - now) / 1000));
  const pending = game.submissions.some((s) => s.verdict === 'PENDING');
  const editable = game.phase === 'ACTIVE' && !done;
  return (
    <>
      <div className="match-heading">
        <div>
          <div className="page-eyebrow">
            {game.mode === 'casual' ? 'CASUAL · UNVERIFIED' : game.mode.toUpperCase()} DUEL{' '}
            <span className="alpha-tag">PYTHON</span>
          </div>
          <h1>
            {done
              ? 'The results are in.'
              : game.phase === 'WAITING_READY'
                ? 'Your opponent is here.'
                : 'Make every line count.'}
          </h1>
        </div>
        <span className={'connection ' + (connected ? 'online' : '')}>
          {connected ? 'Live connection' : 'Reconnecting…'}
        </span>
      </div>
      <div className="versus-bar">
        <div className="duelist">
          <span className="avatar">{me.username.slice(0, 2)}</span>
          <div>
            <strong>
              {me.username} <span className="you-tag">YOU</span>
            </strong>
            <span>
              {rank(me.rating)} · {me.rating} MMR
            </span>
          </div>
        </div>
        <div className="match-timer">
          <Icon name="clock" />
          <strong>
            {game.phase === 'COUNTDOWN'
              ? Math.max(0, Math.ceil((game.startedAt! - now) / 1000))
              : game.phase === 'WAITING_READY'
                ? 'READY?'
                : done
                  ? 'FINISHED'
                  : `${Math.floor(seconds / 60)
                      .toString()
                      .padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`}
          </strong>
        </div>
        <div className="duelist opponent">
          <div>
            <strong>{opponent.username}</strong>
            <span>
              {rank(opponent.rating)} · {opponent.rating} MMR
            </span>
          </div>
          <span className="avatar rival">{opponent.username.slice(0, 2)}</span>
        </div>
      </div>
      {game.phase === 'WAITING_READY' || game.phase === 'COUNTDOWN' ? (
        <section className="ready-screen">
          <RankBadge small />
          <h2>
            {game.phase === 'COUNTDOWN' ? 'One problem. One winner.' : 'Good luck. Have fun.'}
          </h2>
          <p>
            {game.phase === 'COUNTDOWN'
              ? 'The problem unlocks when the countdown ends.'
              : me.ready
                ? 'You’re ready. Waiting for your opponent…'
                : 'Both players must be ready before the problem is revealed.'}
          </p>
          {game.phase === 'WAITING_READY' && (
            <button
              className="button primary"
              disabled={busy || me.ready}
              onClick={() => void mutate('ready')}
            >
              {me.ready ? 'Ready ✓' : 'I’m ready'}
              <Icon name="arrow" />
            </button>
          )}
          <button className="text-button" onClick={() => void mutate('forfeit')}>
            Leave match
          </button>
        </section>
      ) : (
        <>
          {done && (
            <section className="result-banner" aria-live="polite">
              <div>
                <span className="page-eyebrow">
                  {game.outcome?.rated ? 'RANKED RESULT' : 'NO RATING CHANGE'}
                </span>
                <h2>
                  {game.phase === 'NO_CONTEST'
                    ? 'No contest'
                    : game.phase === 'CANCELLED'
                      ? 'Match cancelled'
                      : game.outcome?.winnerId === user.id
                        ? 'Victory. Well played.'
                        : game.outcome?.winnerId
                          ? 'A worthy opponent.'
                          : 'An even match.'}
                </h2>
                <p>
                  {game.outcome?.reason} {game.settled ? 'Result saved.' : 'Saving result…'}
                </p>
              </div>
              <div className="result-actions">
                <button className="button primary" onClick={onLeave}>
                  Back to arena <Icon name="arrow" />
                </button>
                {now - (game.finishedAt ?? 0) < 30000 && game.settled && (
                  <button
                    className="button secondary"
                    disabled={busy || game.rematchVotes.includes(user.id)}
                    onClick={() => void mutate('rematch')}
                  >
                    {game.rematchVotes.includes(user.id)
                      ? 'Waiting for rematch…'
                      : 'Rematch · unrated'}
                  </button>
                )}
              </div>
            </section>
          )}
          {game.phase === 'RESOLVING' && (
            <div className="setup-note" aria-live="polite">
              <span className="spinner" />
              Checking the final submissions. Earlier submissions keep their place.
            </div>
          )}
          {game.problem && (
            <div className="workspace">
              <section className="problem-panel">
                <div className="panel-tabs">
                  <button
                    className={tab === 'problem' ? 'selected' : ''}
                    onClick={() => setTab('problem')}
                  >
                    Problem
                  </button>
                  <button
                    className={tab === 'results' ? 'selected' : ''}
                    onClick={() => setTab('results')}
                  >
                    Your submissions <span>{game.submissions.length}</span>
                  </button>
                </div>
                {tab === 'problem' ? (
                  <div className="problem-content">
                    <div className="problem-tags">
                      <span data-difficulty={game.problem.difficulty.toLowerCase()}>
                        {game.problem.difficulty}
                      </span>
                      <span>{game.problem.topic}</span>
                    </div>
                    <h2>{game.problem.title}</h2>
                    <p>{game.problem.statement}</p>
                    <h3>Input</h3>
                    <p>{game.problem.inputFormat}</p>
                    <h3>Output</h3>
                    <p>{game.problem.outputFormat}</p>
                    {game.problem.examples.map((example, i) => (
                      <div className="example" key={i}>
                        <h3>Example {i + 1}</h3>
                        <div>
                          <label>INPUT</label>
                          <pre>{example.input}</pre>
                          <label>OUTPUT</label>
                          <pre>{example.output}</pre>
                        </div>
                        {example.explanation && <p>{example.explanation}</p>}
                      </div>
                    ))}
                    <h3>Constraints</h3>
                    <ul>
                      {game.problem.constraints.map((c) => (
                        <li key={c}>{c}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="submissions-panel">
                    <PythonResults run={localRun} />
                    {!game.submissions.length ? (
                      <div className="empty-state">
                        <Icon name="code" />
                        <h3>Test your first idea.</h3>
                        <p>Run examples or submit a solution to see your results here.</p>
                      </div>
                    ) : (
                      [...game.submissions].reverse().map((s) => (
                        <article className="submission" key={s.id}>
                          <div>
                            <strong className={s.verdict === 'AC' ? 'accepted' : ''}>
                              {s.verdict === 'PENDING'
                                ? 'Judging…'
                                : s.verdict === 'JUDGE_ERROR'
                                  ? 'Judge unavailable'
                                  : s.verdict}
                            </strong>
                            <span>
                              {s.kind === 'run' ? 'Public examples' : 'Hidden tests'} ·{' '}
                              {new Date(s.receiptMs).toLocaleTimeString()}
                            </span>
                          </div>
                          {s.output && <pre>{s.output}</pre>}
                        </article>
                      ))
                    )}
                  </div>
                )}
              </section>
              <section className="editor-panel">
                <div className="editor-toolbar">
                  <span>
                    <Icon name="code" /> solution.py
                  </span>
                  <span>
                    Python 3 <span className="tiny-dot" />
                  </span>
                </div>
                <div className="editor-container">
                  <Suspense fallback={<div className="editor-loading">Loading editor…</div>}>
                    <CodeEditor value={source} onChange={setSource} disabled={done} />
                  </Suspense>
                </div>
                <div className="editor-bottom">
                  <span>Saved in this browser</span>
                  <div>
                    <button
                      className="button secondary"
                      disabled={!editable || !!localRun.status}
                      onClick={() => {
                        setTab('results');
                        void localRun.run(source, game.problem!.examples);
                      }}
                    >
                      <span aria-hidden="true">▷</span> Run
                    </button>
                    <button
                      className="button primary"
                      disabled={!editable || busy || pending || !!localRun.status}
                      onClick={() =>
                        void (game.mode === 'casual' ? completeCasual() : execute('submit'))
                      }
                    >
                      {game.mode === 'casual' ? 'Check & finish' : 'Submit'} <Icon name="arrow" />
                    </button>
                  </div>
                </div>
                {health?.judge === 'unavailable' && (
                  <div className="editor-notice">
                    {game.mode === 'casual'
                      ? 'Pass the public examples to report completion. Results are unverified and never change ratings.'
                      : 'Run examples on your device. Ranked Submit needs the server judge, which is not configured yet.'}
                  </div>
                )}
              </section>
            </div>
          )}
          {!done && (
            <div className="match-foot">
              <span>First correct submission wins. Server time is authoritative.</span>
              <button
                className="text-button"
                onClick={() => {
                  if (
                    window.confirm(
                      'Forfeit this match? Your opponent will win unless an earlier accepted submission decides the result.',
                    )
                  )
                    void mutate('forfeit');
                }}
              >
                Forfeit match
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
