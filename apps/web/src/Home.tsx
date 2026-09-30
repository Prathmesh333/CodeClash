import { useSectionMotion } from './useSectionMotion';
import type { User } from '../../../packages/shared/game';

type Props = {
  user: User | null;
  players: User[];
  casual: boolean;
  unavailable: boolean;
  busy: boolean;
  queued: boolean;
  join: () => void;
  navigate: (page: 'arena' | 'leaderboard' | 'history') => void;
};
export function AssetIcon({ name }: { name: string }) {
  return (
    <span
      aria-hidden="true"
      className="asset-icon"
      style={{
        maskImage: `url(/brand/icons/${name}.svg)`,
        WebkitMaskImage: `url(/brand/icons/${name}.svg)`,
      }}
    />
  );
}
export default function Home({
  user,
  players,
  casual,
  unavailable,
  busy,
  queued,
  join,
  navigate,
}: Props) {
  const motionRef = useSectionMotion();
  const label = unavailable
    ? 'Ranked matches coming soon'
    : queued
      ? 'Finding your opponent…'
      : casual
        ? 'Find a casual match'
        : 'Find a match';
  const cta = (
    <button className="button primary" disabled={busy || queued || unavailable} onClick={join}>
      <AssetIcon name="crossed-swords" />
      {label}
      <span aria-hidden="true">→</span>
    </button>
  );
  return (
    <div className="cc-home" ref={motionRef}>
      <section className="cc-hero">
        <div className="cc-hero-copy">
          <p className="cc-eyebrow">YOUR NEXT CHALLENGE STARTS HERE</p>
          <h1>
            Compete. Solve.
            <br />
            <em>Clash.</em>
          </h1>
          <p className="cc-intro">
            One problem. Two programmers. Put your Python skills to the test in a live coding duel.
          </p>
          <div className="cc-actions">
            {cta}
            <a className="button secondary" href="#how-it-works">
              <AssetIcon name="code" />
              How it works
            </a>
          </div>
          <p className="cc-disclosure">
            {casual
              ? 'Casual beta · Browser-checked results · No rating changes'
              : 'Python alpha · Ranked judging in development'}
          </p>
          <div className="cc-features">
            {[
              ['users', '1v1', 'Live coding'],
              ['code', 'Python', 'On your device'],
              ['pulse', '20 min', 'One shared clock'],
            ].map(([icon, value, detail]) => (
              <div key={value}>
                <AssetIcon name={icon} />
                <span>
                  <strong>{value}</strong>
                  <small>{detail}</small>
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="cc-preview" aria-label="Illustrative coding match preview">
          <div className="cc-preview-top">
            <img src="/brand/logo/codeclash-mark.svg" alt="" />
            <strong>
              CODE<span>CLASH</span>
            </strong>
            <small>Match preview</small>
            <b>20:00</b>
          </div>
          <div className="cc-preview-players">
            <span>
              <i>YOU</i> Your next challenge
            </span>
            <small>VS</small>
            <span>
              {' '}
              A worthy opponent <i>?</i>
            </span>
          </div>
          <div className="cc-preview-body">
            <div className="cc-problem">
              <span className="cc-eyebrow">THE PROBLEM</span>
              <h3>
                Pair Sum <small>Easy</small>
              </h3>
              <p>Find two numbers that add up to the target. Return their indices.</p>
              <div className="cc-preview-tabs">
                Example <span>Python 3</span>
              </div>
              <pre>{'Input:  [2, 7, 11, 15]\nTarget: 9\nOutput: [0, 1]'}</pre>
              <p className="cc-example-note">Two minds. The same starting line.</p>
            </div>
            <div className="cc-code">
              <div>
                solution.py <span>PYTHON 3</span>
              </div>
              <pre>
                <span className="code-purple">def</span>
                {' two_sum(nums, target):\n'}
                <span className="code-muted">{'    # Find your approach\n'}</span>
                {'    seen = {}\n'}
                <span className="code-purple">{'    for'}</span>
                {' i, n in enumerate(nums):\n        other = target - n\n'}
                <span className="code-purple">{'        if'}</span>
                {' other in seen:\n'}
                <span className="code-lime">{'            return'}</span>
                {' [seen[other], i]\n        seen[n] = i'}
              </pre>
            </div>
          </div>
          <div className="cc-preview-foot">
            <span>● Python in your browser</span>
            <small>Illustrative preview · not a live match</small>
          </div>
        </div>
      </section>
      <section className="cc-metrics" aria-label="Your statistics">
        {[
          [
            'crossed-swords',
            'YOUR RANKED MATCHES',
            String(user?.games_played ?? 0),
            'Casual matches appear in history',
          ],
          [
            'target',
            'YOUR RANKED WIN RATE',
            user?.games_played ? `${Math.round((user.wins / user.games_played) * 100)}%` : '—',
            'Ratings stay unchanged in casual play',
          ],
          [
            'chart',
            'YOUR RATING',
            user ? user.rating.toLocaleString() : '—',
            user ? 'Your saved account rating' : 'Sign in to create your profile',
          ],
          [
            'code',
            'CURRENT GAME MODE',
            casual ? 'Casual 1v1' : 'Python alpha',
            'Public examples · browser execution',
          ],
        ].map(([icon, title, value, detail]) => (
          <article key={title}>
            <div className="cc-icon-box">
              <AssetIcon name={icon} />
            </div>
            <div>
              <h2>{title}</h2>
              <strong>{value}</strong>
              <p>{detail}</p>
            </div>
          </article>
        ))}
      </section>
      <section id="how-it-works" className="cc-how cc-panel">
        <div className="cc-section-title">
          <h2>HOW IT WORKS</h2>
          <span>Same problem. Same clock.</span>
        </div>
        <div className="cc-steps">
          {[
            [
              'users',
              'Get matched',
              'Sign in with GitHub and join the queue. Both players ready up before the clock starts.',
            ],
            [
              'code',
              'Solve live',
              'Write Python in the shared arena. Run public examples securely in your browser.',
            ],
            [
              'trophy',
              'Finish your duel',
              casual
                ? 'Pass the examples and report completion. Results are unverified; no MMR is awarded.'
                : 'Verified ranked play is in development. Explore the arena in the meantime.',
            ],
          ].map(([icon, title, text], i) => (
            <article key={title}>
              <span className="cc-step-number">{i + 1}</span>
              <AssetIcon name={icon} />
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="cc-bottom-grid">
        <article className="cc-panel cc-feature-card">
          <p className="cc-eyebrow">YOUR CODING JOURNEY</p>
          <div>
            <div className="cc-icon-box">
              <AssetIcon name="file-code" />
            </div>
            <section>
              <h3>Every duel, remembered.</h3>
              <p>Revisit your completed matches and see how each round ended.</p>
            </section>
          </div>
          <button className="button secondary" onClick={() => navigate('history')}>
            View match history <span>→</span>
          </button>
        </article>
        <article className="cc-panel cc-feature-card">
          <p className="cc-eyebrow">ON THE HORIZON</p>
          <div>
            <div className="cc-icon-box">
              <AssetIcon name="trophy" />
            </div>
            <section>
              <h3>A bigger stage awaits.</h3>
              <p>Tournaments and verified ranked matches are planned for a future release.</p>
            </section>
          </div>
          <span className="cc-soon">COMING LATER</span>
        </article>
        <article className="cc-panel cc-leaders">
          <div className="cc-section-title">
            <h2>THE RANKED LADDER</h2>
            <button onClick={() => navigate('leaderboard')}>View all →</button>
          </div>
          {players.filter((p) => p.games_played > 0).length ? (
            <ol>
              {players
                .filter((p) => p.games_played > 0)
                .slice(0, 3)
                .map((p) => (
                  <li key={p.id}>
                    <span>{p.username}</span>
                    <strong>{p.rating.toLocaleString()}</strong>
                  </li>
                ))}
            </ol>
          ) : (
            <div className="cc-ladder-empty">
              <AssetIcon name="chart" />
              <strong>The climb is still ahead.</strong>
              <p>
                Verified ranked results will appear here. Casual duels don’t affect this ladder.
              </p>
            </div>
          )}
        </article>
      </section>
      <footer className="cc-banner">
        <img src="/brand/logo/codeclash-mark.svg" alt="" />
        <div>
          <p className="cc-eyebrow">BUILT FOR YOUR NEXT BREAKTHROUGH</p>
          <h2>Ready to enter the arena?</h2>
          <p>Bring a friend. Bring your best approach.</p>
        </div>
        <button className="button primary" disabled={busy || queued || unavailable} onClick={join}>
          <AssetIcon name="crossed-swords" />
          Start competing <span>→</span>
        </button>
      </footer>
    </div>
  );
}
