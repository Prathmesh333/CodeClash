import { useSyncExternalStore } from 'react';
const key = 'codeclash:storage-choice';
let preference = false;
let chosen = false;
const listeners = new Set<() => void>();
export function initializeStorage() {
  try {
    const value = localStorage.getItem(key);
    chosen = value === 'preferences' || value === 'essential';
    preference = value === 'preferences';
  } catch {}
}
export function preferencesAllowed() {
  return preference;
}
export function storageChosen() {
  return chosen;
}
export function chooseStorage(allow: boolean) {
  preference = allow;
  chosen = true;
  try {
    localStorage.setItem(key, allow ? 'preferences' : 'essential');
    if (!allow)
      for (const name of Object.keys(localStorage))
        if (name === 'codeclash:theme' || name.startsWith('rdsa:')) localStorage.removeItem(name);
  } catch {}
  listeners.forEach((fn) => fn());
  window.dispatchEvent(new Event('codeclash:storage-change'));
}
export function useStorageChoice() {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    () => `${chosen}:${preference}`,
  );
}
export function readDraft(key: string) {
  try {
    return preference ? (localStorage.getItem(key) ?? '') : '';
  } catch {
    return '';
  }
}
export function saveDraft(key: string, source: string) {
  if (preference)
    try {
      localStorage.setItem(key, source);
    } catch {}
}
export function clearDrafts() {
  try {
    for (const name of Object.keys(localStorage))
      if (name.startsWith('rdsa:')) localStorage.removeItem(name);
  } catch {}
}

window.addEventListener('storage', (event) => {
  if (event.key === 'codeclash:storage-choice') {
    initializeStorage();
    listeners.forEach((fn) => fn());
  }
});
