import { useEffect, useState } from 'react';
export type Theme = 'system' | 'light' | 'dark';
export const THEME_KEY = 'boktok.theme.v1';
export function readTheme(): Theme {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    return 'system';
  }
}
export function applyTheme(theme: Theme) {
  const dark =
    theme === 'dark' ||
    (theme === 'system' &&
      window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', dark ? '#17211c' : '#284f40');
}
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(readTheme);
  const [error, setError] = useState('');
  useEffect(() => {
    applyTheme(theme);
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    const change = () => applyTheme(theme);
    media?.addEventListener('change', change);
    return () => media?.removeEventListener('change', change);
  }, [theme]);
  useEffect(() => {
    const sync = (e: StorageEvent) => {
      if (e.key === THEME_KEY || e.key === null) setTheme(readTheme());
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  function choose(next: Theme) {
    setTheme(next);
    try {
      localStorage.setItem(THEME_KEY, next);
      setError('');
    } catch {
      setError(
        'Utseendet ändrades, men webbläsaren kunde inte spara ditt val.',
      );
    }
  }
  return { theme, choose, error };
}
