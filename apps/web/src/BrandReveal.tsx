import { useEffect, useState } from 'react';
import './brand-reveal.css';

let introduced = false;

/** A finite brand sequence. Login controls remain available throughout. */
export default function BrandReveal() {
  const [playing, setPlaying] = useState(!introduced);
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
    const timer = window.setTimeout(() => setPlaying(false), 2400);
    return () => clearTimeout(timer);
  }, [playing, take]);

  return (
    <div className="brand-reveal">
      <div key={take} className={`brand-reveal-stage ${playing ? 'is-playing' : ''}`}>
        <div className="brand-reveal-frame" aria-hidden="true" />
        <svg className="brand-reveal-symbol" viewBox="0 0 160 92" aria-hidden="true">
          <g className="brand-reveal-turn">
            <path className="brand-reveal-left" d="M52 18 16 46 52 74 52 59 35 46 52 33Z" />
            <path className="brand-reveal-slash" d="M88 6 65 86H81L104 6Z" />
            <path className="brand-reveal-right" d="M108 18 144 46 108 74 108 59 125 46 108 33Z" />
          </g>
        </svg>
        <div className="brand-reveal-name" aria-label="CodeClash">
          <span>CODE</span>
          <span>CLASH</span>
        </div>
        <span className="brand-reveal-domain">code-clash.com</span>
      </div>
      <button
        className="brand-reveal-control"
        onClick={() => {
          if (playing) setPlaying(false);
          else {
            setTake((value) => value + 1);
            setPlaying(true);
          }
        }}
      >
        {playing ? 'Skip animation' : 'Replay intro'}
      </button>
    </div>
  );
}
