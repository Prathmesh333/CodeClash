import { useEffect, useState } from 'react';
import './brand-reveal.css';

let introduced = false;

export function BrandSpinner({ label }: { label: string }) {
  return (
    <div className="brand-loading" role="status">
      <svg viewBox="0 0 160 92" aria-hidden="true">
        <g>
          <path d="M52 18 16 46 52 74 52 59 35 46 52 33Z M108 18 144 46 108 74 108 59 125 46 108 33Z" />
          <path fill="var(--cc-lime)" d="M88 6 65 86H81L104 6Z" />
        </g>
      </svg>
      <span>{label}</span>
    </div>
  );
}

function firstArrival() {
  if (introduced) return false;
  // Internal links reload this SPA too. Avoid replaying the wordmark on those
  // navigations without adding cookies or browser-storage preferences.
  try {
    return !document.referrer || new URL(document.referrer).origin !== location.origin;
  } catch {
    return true;
  }
}

/** A finite brand sequence. Login controls remain available throughout. */
export default function BrandReveal() {
  const [fullIntro, setFullIntro] = useState(firstArrival);
  const [playing, setPlaying] = useState(true);
  const [take, setTake] = useState(0);

  useEffect(() => {
    introduced = true;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const settle = () => {
      if (motion.matches) setPlaying(false);
    };
    settle();
    motion.addEventListener('change', settle);
    return () => motion.removeEventListener('change', settle);
  }, []);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => setPlaying(false), fullIntro ? 2400 : 700);
    return () => clearTimeout(timer);
  }, [playing, take, fullIntro]);

  return (
    <div className="brand-reveal">
      <div
        key={take}
        className={`brand-reveal-stage ${fullIntro ? 'is-intro' : 'is-symbol-only'} ${playing ? 'is-playing' : ''}`}
      >
        <div className="brand-reveal-frame" aria-hidden="true" />
        <svg className="brand-reveal-symbol" viewBox="0 0 160 92" aria-hidden="true">
          <g className="brand-reveal-turn">
            <path className="brand-reveal-left" d="M52 18 16 46 52 74 52 59 35 46 52 33Z" />
            <path className="brand-reveal-slash" d="M88 6 65 86H81L104 6Z" />
            <path className="brand-reveal-right" d="M108 18 144 46 108 74 108 59 125 46 108 33Z" />
          </g>
        </svg>
        {fullIntro && (
          <>
            <div className="brand-reveal-name" aria-label="CodeClash">
              <span>CODE</span>
              <span>CLASH</span>
            </div>
            <span className="brand-reveal-domain">code-clash.com</span>
          </>
        )}
      </div>
      <button
        className="brand-reveal-control"
        onClick={() => {
          if (playing) setPlaying(false);
          else {
            setFullIntro(false);
            setTake((value) => value + 1);
            setPlaying(true);
          }
        }}
      >
        {playing ? 'Skip animation' : 'Replay animation'}
      </button>
    </div>
  );
}
