import type { User } from '../../../packages/shared/game';

type Props = {
  user: User;
  matches: { id: string; problemTitle: string; finished_at: number; mode: string }[];
  casual: boolean;
  unavailable: boolean;
  busy: boolean;
  queued: boolean;
  join: () => void;
  editProfile: () => void;
  navigate: (page: 'arena' | 'history' | 'leaderboard') => void;
};
export default function Dashboard({
  user,
  matches,
  casual,
  unavailable,
  busy,
  queued,
  join,
  editProfile,
  navigate,
}: Props) {
  return (
    <div className="player-dashboard">
      <header className="dashboard-heading">
        <h1>Arena</h1>
        <p>
          Playing as <strong>{user.profile_complete === 0 ? 'your account' : user.username}</strong>
        </p>
      </header>
      <div className="dashboard-workspace">
        <section className="dashboard-match" aria-labelledby="find-opponent-title">
          <h2 id="find-opponent-title">Find an opponent</h2>
          <p>
            Both players receive the same Python problem. Confirm you’re ready, then solve it
            against a shared 20-minute clock.
          </p>
          <dl className="dashboard-match-details">
            <div>
              <dt>Language</dt>
              <dd>Python</dd>
            </div>
            <div>
              <dt>Players</dt>
              <dd>1v1</dd>
            </div>
            <div>
              <dt>Mode</dt>
              <dd>{casual ? 'Casual' : 'Python alpha'}</dd>
            </div>
          </dl>
          <button
            className="button primary"
            disabled={busy || queued || unavailable}
            onClick={join}
          >
            {queued
              ? 'In matchmaking queue'
              : busy
                ? 'Joining…'
                : casual
                  ? 'Find a casual match'
                  : 'Find a match'}
          </button>
          <p className="dashboard-mode-note">
            {unavailable
              ? 'Matchmaking is unavailable while the code judge is being configured.'
              : casual
                ? 'Casual results are unverified and do not change your rating.'
                : 'Run public examples in your browser. Verified judging is in development.'}
          </p>
        </section>
        <aside className="dashboard-profile" aria-labelledby="player-profile-title">
          <h2 id="player-profile-title">Player profile</h2>
          <div className="dashboard-identity">
            <span className={`avatar avatar-${user.avatar_color ?? 'blue'}`}>
              {(user.profile_complete === 0 ? 'You' : user.username).slice(0, 2).toUpperCase()}
            </span>
            <strong>{user.profile_complete === 0 ? 'Choose your username' : user.username}</strong>
          </div>
          <p>{user.bio || 'Add a bio and choose your avatar color in your profile.'}</p>
          <button className="button secondary" onClick={editProfile}>
            {user.profile_complete === 0 ? 'Complete profile' : 'Manage profile'}
          </button>
        </aside>
      </div>
      <section className="dashboard-history" aria-labelledby="recent-matches-title">
        <div className="dashboard-section-heading">
          <h2 id="recent-matches-title">Recent matches</h2>
          <button className="button secondary small" onClick={() => navigate('history')}>
            View match history
          </button>
        </div>
        {matches.length ? (
          <ul>
            {matches.slice(0, 3).map((match) => (
              <li key={match.id}>
                <strong>{match.problemTitle}</strong>
                <span>
                  {match.mode} · {new Date(match.finished_at).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="dashboard-history-empty">
            <p>No completed matches yet.</p>
            <p>Your results will appear here after you finish a match.</p>
          </div>
        )}
      </section>
    </div>
  );
}
