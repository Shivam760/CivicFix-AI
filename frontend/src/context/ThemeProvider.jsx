import React, { useCallback, useEffect, useState } from 'react';
import { ThemeContext } from './ThemeContext';

const STORAGE_KEY = 'civicfix_theme';

// Saved choice first; otherwise follow the operating system setting.
function initialTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // Storage blocked: fall through to the system setting.
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * ThemeProvider
 * Light or dark mode. Puts data-theme="light|dark" on <html>; the CSS in
 * index.css and styles/dark-palette.css does the rest. The choice is kept
 * in localStorage for this browser only.
 */
export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(initialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const setTheme = useCallback((next) => {
    setThemeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Not saved; it still applies until the tab closes.
    }
  }, []);

  const value = {
    theme,
    isDark: theme === 'dark',
    setTheme,
    toggleTheme: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export default ThemeProvider;
