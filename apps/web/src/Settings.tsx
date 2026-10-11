import type { User } from '../../../packages/shared/game';
import ThemePicker from './ThemePicker';
import './settings.css';

export default function Settings({
  user,
  busy,
  editProfile,
  signOut,
}: {
  user: User;
  busy: boolean;
  editProfile: () => void;
  signOut: () => void;
}) {
  return (
    <section className="settings-page" aria-labelledby="settings-title">
      <h1 id="settings-title">Settings</h1>
      <p className="settings-intro">Your profile, appearance, and account.</p>
      <section className="settings-section" aria-labelledby="settings-profile">
        <div>
          <h2 id="settings-profile">Profile</h2>
          <p>
            {user.profile_complete === 0
              ? 'Choose your username to complete your profile.'
              : `Playing as ${user.username}`}
          </p>
          {user.bio && <p>{user.bio}</p>}
        </div>
        <button className="button secondary" onClick={editProfile}>
          Edit profile
        </button>
      </section>
      <section className="settings-section" aria-labelledby="settings-appearance">
        <div>
          <h2 id="settings-appearance">Appearance</h2>
          <p>Choose the palette that feels right for you.</p>
        </div>
        <ThemePicker />
      </section>
      <section className="settings-section" aria-labelledby="settings-privacy">
        <div>
          <h2 id="settings-privacy">Privacy and data</h2>
          <p>Manage saved preferences, export your data, or delete your account.</p>
        </div>
        <a className="button secondary" href="/privacy">
          Manage privacy
        </a>
      </section>
      <section className="settings-section" aria-labelledby="settings-account">
        <div>
          <h2 id="settings-account">Account</h2>
          <p>Sign out on this device. Your profile and match history stay saved.</p>
        </div>
        <button className="button secondary" disabled={busy} onClick={signOut}>
          Sign out
        </button>
      </section>
    </section>
  );
}
