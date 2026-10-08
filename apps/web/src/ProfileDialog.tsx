import { useEffect, useRef, useState } from 'react';
import type { User } from '../../../packages/shared/game';
import { api } from './api';
export default function ProfileDialog({
  user,
  onClose,
  onSaved,
}: {
  user: User;
  onClose: () => void;
  onSaved: () => Promise<unknown>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [username, setUsername] = useState(user.profile_complete ? user.username : '');
  const [bio, setBio] = useState(user.bio ?? '');
  const [color, setColor] = useState(user.avatar_color ?? 'blue');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="login-dialog profile-dialog"
      aria-labelledby="profile-title"
      onCancel={onClose}
    >
      <button className="dialog-close" onClick={onClose} aria-label="Close profile">
        ×
      </button>
      <div className={`avatar profile-avatar avatar-${color}`}>
        {(username || 'You').slice(0, 2).toUpperCase()}
      </div>
      <h2 id="profile-title">
        {user.profile_complete ? 'Your player profile.' : 'Choose your arena name.'}
      </h2>
      <p>One account, one unique username. This is how other players will know you.</p>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (busy) return;
          setBusy(true);
          setError('');
          try {
            await api('/profile', { username, bio, avatar_color: color });
            await onSaved();
            onClose();
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not save your profile.');
          } finally {
            setBusy(false);
          }
        }}
      >
        <label htmlFor="profile-username">Username</label>
        <input
          autoComplete="nickname"
          id="profile-username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          minLength={3}
          maxLength={20}
          pattern="[A-Za-z][A-Za-z0-9_]{2,19}"
          required
          aria-describedby="username-help"
        />
        <small id="username-help">
          3–20 letters, numbers, or underscores. Start with a letter. Names ignore capitalization.
        </small>
        <label htmlFor="profile-bio">
          About you <span>(optional)</span>
        </label>
        <textarea
          id="profile-bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={160}
          rows={3}
        />
        <small>{bio.length}/160 characters</small>
        <fieldset>
          <legend>Avatar color</legend>
          <div className="avatar-colors">
            {['blue', 'lime', 'purple', 'gold', 'cyan'].map((option) => (
              <label key={option}>
                <input
                  type="radio"
                  name="avatar-color"
                  value={option}
                  checked={color === option}
                  onChange={() => setColor(option)}
                />
                <span className={`avatar avatar-${option}`} aria-hidden="true">
                  Aa
                </span>
                <span>{option}</span>
              </label>
            ))}
          </div>
        </fieldset>
        {error && (
          <p className="profile-error" role="alert">
            {error}
          </p>
        )}
        <button className="button primary" disabled={busy}>
          {busy ? 'Saving…' : 'Save profile'}
        </button>
      </form>
    </dialog>
  );
}
