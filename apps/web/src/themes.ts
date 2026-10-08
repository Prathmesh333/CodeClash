import { preferencesAllowed } from './storage';
import { useSyncExternalStore } from 'react';
export type Theme = {
  id: string;
  name: string;
  mode: 'light' | 'dark';
  bg: string;
  surface: string;
  alt: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
  secondary: string;
};
export const themes: Theme[] = [
  {
    id: 'codeclash-light',
    name: 'CodeClash Light',
    mode: 'light',
    bg: '#F7FAFC',
    surface: '#FFFFFF',
    alt: '#F1F5F9',
    border: '#D9E2EC',
    text: '#0F172A',
    muted: '#64748B',
    accent: '#76B900',
    secondary: '#2563EB',
  },
  {
    id: 'midnight-mint',
    name: 'Midnight Mint',
    mode: 'dark',
    bg: '#0B1018',
    surface: '#141C28',
    alt: '#1B2636',
    border: '#293648',
    text: '#ECF1F8',
    muted: '#A7B5C8',
    accent: '#7CE8C2',
    secondary: '#80B8FF',
  },
  {
    id: 'graphite-lime',
    name: 'Graphite Lime',
    mode: 'dark',
    bg: '#101211',
    surface: '#1B201D',
    alt: '#252D27',
    border: '#343E37',
    text: '#F0F4F1',
    muted: '#ADB9B0',
    accent: '#76B900',
    secondary: '#A7C6EF',
  },
  {
    id: 'ink-blue',
    name: 'Ink Blue',
    mode: 'dark',
    bg: '#0C1220',
    surface: '#172236',
    alt: '#21304A',
    border: '#2E405D',
    text: '#EEF3FC',
    muted: '#ADBBD1',
    accent: '#A6C8FF',
    secondary: '#B7A8F5',
  },
  {
    id: 'obsidian-amber',
    name: 'Obsidian Amber',
    mode: 'dark',
    bg: '#121212',
    surface: '#1E1E1D',
    alt: '#2B2925',
    border: '#3D3A33',
    text: '#F5F2EA',
    muted: '#B9B2A4',
    accent: '#F1BC68',
    secondary: '#A8C4DD',
  },
  {
    id: 'porcelain-teal',
    name: 'Porcelain Teal',
    mode: 'light',
    bg: '#F6F8F7',
    surface: '#FFFFFF',
    alt: '#EAF1EF',
    border: '#D7E2DF',
    text: '#142B29',
    muted: '#506B67',
    accent: '#105E54',
    secondary: '#285DA0',
  },
  {
    id: 'carbon-coral',
    name: 'Carbon Coral',
    mode: 'dark',
    bg: '#141419',
    surface: '#202129',
    alt: '#2B2D38',
    border: '#3A3C48',
    text: '#F4F3F8',
    muted: '#B5B5C5',
    accent: '#FFA28E',
    secondary: '#9DB9F5',
  },
  {
    id: 'slate-ice',
    name: 'Slate Ice',
    mode: 'dark',
    bg: '#101820',
    surface: '#1B2834',
    alt: '#253746',
    border: '#344B5D',
    text: '#EFF6FB',
    muted: '#AABECE',
    accent: '#A0D8F1',
    secondary: '#B8BFF5',
  },
  {
    id: 'white-lime-studio',
    name: 'White / Lime Studio',
    mode: 'light',
    bg: '#FAFBF8',
    surface: '#FFFFFF',
    alt: '#F0F4E9',
    border: '#DFE4DA',
    text: '#18221A',
    muted: '#596558',
    accent: '#76B900',
    secondary: '#245CC6',
  },
  {
    id: 'white-cobalt-arena',
    name: 'White / Cobalt Arena',
    mode: 'light',
    bg: '#F7F9FC',
    surface: '#FFFFFF',
    alt: '#EDF2FA',
    border: '#DDE4EE',
    text: '#16243B',
    muted: '#55657E',
    accent: '#76B900',
    secondary: '#275DDD',
  },
  {
    id: 'white-citrus-play',
    name: 'White / Citrus Play',
    mode: 'light',
    bg: '#FFFCF7',
    surface: '#FFFFFF',
    alt: '#F7F1E7',
    border: '#E8E2D7',
    text: '#25251E',
    muted: '#686456',
    accent: '#76B900',
    secondary: '#2D61C8',
  },
];
let selected = themes[0];
const listeners = new Set<() => void>();
const key = 'codeclash:theme';
function apply(theme: Theme) {
  const dark = theme.mode === 'dark';
  const root = document.documentElement;
  root.dataset.theme = theme.id;
  root.dataset.themeMode = theme.mode;
  root.style.colorScheme = theme.mode;
  const tokens: Record<string, string> = {
    bg: theme.bg,
    surface: theme.surface,
    'surface-2': theme.alt,
    border: theme.border,
    'border-strong': theme.border,
    text: theme.text,
    secondary: theme.muted,
    muted: theme.muted,
    lime: theme.accent,
    'lime-hover': theme.accent,
    'lime-soft': dark ? theme.alt : theme.id === 'porcelain-teal' ? '#D7EEEA' : '#ECFCCB',
    'lime-ink': dark ? theme.accent : theme.id === 'porcelain-teal' ? theme.accent : '#4D7C0F',
    cyan: dark ? theme.secondary : '#06B6D4',
    'cyan-soft': dark ? theme.alt : '#CFFAFE',
    'cyan-ink': dark ? theme.secondary : '#0E7490',
    blue: theme.secondary,
    'blue-soft': dark ? theme.alt : '#DBEAFE',
    success: dark ? '#79DFB3' : '#22C55E',
    'success-soft': dark ? '#15342C' : '#DCFCE7',
    'success-ink': dark ? '#79DFB3' : '#15803D',
    yellow: dark ? '#F3C74B' : '#F59E0B',
    'warning-soft': dark ? '#352D1C' : '#FEF3C7',
    'warning-ink': dark ? '#F3C74B' : '#92400E',
    danger: dark ? '#FF9CA8' : '#EF4444',
    'danger-soft': dark ? '#381F29' : '#FEE2E2',
    'danger-ink': dark ? '#FF9CA8' : '#B91C1C',
    purple: dark ? '#C3B3FA' : '#7C3AED',
    'purple-soft': dark ? theme.alt : '#EDE9FE',
    gold: dark ? '#EBC86C' : '#CA8A04',
    'gold-soft': dark ? theme.alt : '#FEF9C3',
  };
  for (const [name, value] of Object.entries(tokens)) root.style.setProperty('--cc-' + name, value);
  root.style.setProperty(
    '--cc-action-text',
    theme.id === 'porcelain-teal' ? '#FFFFFF' : theme.bg === '#121212' ? '#121212' : '#0F172A',
  );
}
export function initializeTheme() {
  try {
    selected =
      (preferencesAllowed() ? themes.find((t) => t.id === localStorage.getItem(key)) : undefined) ??
      themes[0];
  } catch {}
  apply(selected);
  window.addEventListener('storage', (event) => {
    if (event.key === key && preferencesAllowed()) {
      selected = themes.find((t) => t.id === event.newValue) ?? themes[0];
      apply(selected);
      listeners.forEach((fn) => fn());
    }
  });
}
export function setTheme(id: string) {
  const next = themes.find((t) => t.id === id);
  if (!next) return;
  selected = next;
  apply(next);
  try {
    if (preferencesAllowed()) localStorage.setItem(key, id);
  } catch {}
  listeners.forEach((fn) => fn());
}
export function useTheme() {
  return useSyncExternalStore(
    (callback) => {
      listeners.add(callback);
      return () => {
        listeners.delete(callback);
      };
    },
    () => selected,
  );
}
