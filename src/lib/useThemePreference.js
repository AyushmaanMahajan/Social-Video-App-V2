'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'cnxr-theme';

export function useThemePreference() {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    if (typeof document === 'undefined') return;

    document.body.classList.toggle('dark-mode', theme === 'dark');
    document.body.dataset.theme = theme;
    document.documentElement.classList.toggle('dark-mode', theme === 'dark');
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') {
      setTheme(stored);
      return;
    }
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(prefersDark ? 'dark' : 'light');
  }, []);

  const toggleTheme = () => {
    setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'));
  };

  return {
    theme,
    isDark: theme === 'dark',
    toggleTheme,
  };
}
