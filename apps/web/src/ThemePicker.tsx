import { useRef } from 'react';
import { themes, useTheme, setTheme } from './themes';
export default function ThemePicker() {
  const theme = useTheme();
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button
        className="button secondary theme-trigger"
        onClick={() => dialog.current?.showModal()}
        aria-label="Change theme"
        title={`Theme: ${theme.name}`}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          aria-hidden="true"
        >
          <path d="M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 1.6-3.2 1.5 1.5 0 0 1 1.2-2.4H18a4 4 0 0 0 4-4C22 6.5 17.5 3 12 3Z" />
          <circle cx="7" cy="10" r="1" />
          <circle cx="11" cy="7" r="1" />
          <circle cx="16" cy="8" r="1" />
        </svg>
        <span>Theme</span>
      </button>
      <dialog ref={dialog} className="theme-dialog" aria-labelledby="theme-heading">
        <div className="theme-dialog-heading">
          <div>
            <h2 id="theme-heading">Make the arena yours.</h2>
            <p>Choose a palette. Your preference is saved on this device.</p>
          </div>
          <button
            className="theme-close"
            aria-label="Close theme picker"
            onClick={() => dialog.current?.close()}
          >
            ×
          </button>
        </div>
        <div className="theme-options" role="group" aria-label="Color themes">
          {themes.map((option) => (
            <button
              key={option.id}
              className="theme-option"
              aria-pressed={theme.id === option.id}
              onClick={() => setTheme(option.id)}
            >
              <span
                className="theme-sample"
                style={{ background: option.bg, borderColor: option.border }}
                aria-hidden="true"
              >
                <i style={{ background: option.surface }} />
                <i style={{ background: option.accent }} />
                <i style={{ background: option.secondary }} />
                <i style={{ background: option.text }} />
              </span>
              <span>
                <strong>{option.name}</strong>
                <small>
                  {option.mode === 'dark' ? 'Dark' : 'Light'}
                  {theme.id === option.id ? ' · Selected' : ''}
                </small>
              </span>
            </button>
          ))}
        </div>
        <div className="theme-dialog-footer">
          <span>Current: {theme.name}</span>
          <button className="button primary" onClick={() => dialog.current?.close()}>
            Done
          </button>
        </div>
      </dialog>
    </>
  );
}
