import { useState } from 'react';
import { chooseStorage, storageChosen, useStorageChoice } from './storage';
export default function CookieControls() {
  useStorageChoice();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="text-button" onClick={() => setOpen(true)}>
        Cookie settings
      </button>
      {(open || !storageChosen()) && (
        <section className="cookie-notice" aria-label="Cookie settings">
          <div>
            <h2>Your device, your choice.</h2>
            <p>
              Sign-in cookies keep your account secure. With your permission, we also save your
              theme and code drafts on this device. No analytics or advertising trackers.
            </p>
            <a href="/cookies">Read the cookie policy</a>
          </div>
          <div className="cookie-actions">
            <button
              className="button secondary"
              onClick={() => {
                chooseStorage(false);
                setOpen(false);
              }}
            >
              Essential only
            </button>
            <button
              className="button secondary"
              onClick={() => {
                chooseStorage(true);
                setOpen(false);
              }}
            >
              Allow saved preferences
            </button>
          </div>
        </section>
      )}
    </>
  );
}
