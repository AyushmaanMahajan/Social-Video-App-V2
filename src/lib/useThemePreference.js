'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'cnxr-theme';

function resolveInitialTheme() {
  if (typeof window === 'undefined') return 'light';

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'dark' || stored === 'light') return stored;

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function useThemePreference() {
  const [theme, setTheme] = useState(resolveInitialTheme);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    document.body.classList.toggle('dark-mode', theme === 'dark');
    document.body.dataset.theme = theme;
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'));
  };

  return {
    theme,
    isDark: theme === 'dark',
    toggleTheme,
  };
}
