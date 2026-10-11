import { useRef, useState, type ReactNode, type CSSProperties } from 'react';

import './workspace.css';

export default function SplitPane({
  first,
  second,
  label,
  vertical = false,
}: {
  first: ReactNode;
  second: ReactNode;
  label: string;
  vertical?: boolean;
}) {
  const [ratio, setRatio] = useState(vertical ? 65 : 42);

  const root = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={root}
      className={`split-pane ${vertical ? 'split-vertical' : 'split-horizontal'}`}
      style={{ '--split-ratio': `${ratio}%` } as CSSProperties}
    >
      <div className="split-first">{first}</div>

      <div
        role="separator"
        aria-label={label}
        aria-orientation={vertical ? 'horizontal' : 'vertical'}
        aria-valuemin={25}
        aria-valuemax={75}
        aria-valuenow={Math.round(ratio)}
        tabIndex={0}
        className="split-handle"

        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
        }}

        onPointerMove={(e) => {
          if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
          const rect = root.current?.getBoundingClientRect();
          if (rect)
            setRatio(
              Math.min(
                75,
                Math.max(
                  25,
                  (100 * (vertical ? e.clientY - rect.top : e.clientX - rect.left)) /
                    (vertical ? rect.height : rect.width),
                ),
              ),
            );
        }}

        onPointerUp={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId))
            e.currentTarget.releasePointerCapture(e.pointerId);
        }}

        onKeyDown={(e) => {
          const minus = vertical ? 'ArrowUp' : 'ArrowLeft',
            plus = vertical ? 'ArrowDown' : 'ArrowRight';
          if (e.key === minus || e.key === plus) {
            e.preventDefault();
            setRatio((r) => Math.max(25, Math.min(75, r + (e.key === plus ? 2 : -2))));
          } else if (e.key === 'Home') {
            e.preventDefault();
            setRatio(25);
          } else if (e.key === 'End') {
            e.preventDefault();
            setRatio(75);
          }
        }}
      />

      <div className="split-second">{second}</div>
    </div>
  );
}
