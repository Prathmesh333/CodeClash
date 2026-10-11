import { useEffect, useRef, useState } from 'react';
import './brand-reveal.css';

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

/** Decorative branding; the native CSS timeline does not rerender each frame. */
export default function BrandReveal() {
  const root = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    let intersecting = true;
    const update = () => setVisible(intersecting && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => {
      intersecting = entry.isIntersecting;
      update();
    });
    if (root.current) observer.observe(root.current);
    document.addEventListener('visibilitychange', update);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', update);
    };
  }, []);
  return (
    <div ref={root} className={`brand-reveal ${visible ? '' : 'is-paused'}`}>
      <div className="brand-reveal-stage">
        <div className="brand-reveal-symbol-wrap" aria-hidden="true">
          <div className="brand-reveal-frame" />
          <svg className="brand-reveal-symbol" viewBox="0 0 132 92">
            <g className="brand-reveal-turn">
              <path className="brand-reveal-left" d="M49 18 13 46 49 74 49 59 32 46 49 33Z" />
              <path className="brand-reveal-slash" d="M70 6 47 86H63L86 6Z" />
              <path className="brand-reveal-right" d="M83 18 119 46 83 74 83 59 100 46 83 33Z" />
            </g>
          </svg>
        </div>
        <div className="brand-reveal-name" aria-label="Code Clash">
          <span>Code</span>
          <span>Clash</span>
        </div>
      </div>
    </div>
  );
}
