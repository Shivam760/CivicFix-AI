import React, { useEffect } from 'react';
import { ThemeContext } from './ThemeContext';

/**
 * ThemeProvider
 * Enforces pure light mode across the CivicFix AI application.
 * Ensures document root consistently presents 'data-theme="light"' with zero dark mode overhead.
 */
export function ThemeProvider({ children }) {
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', 'light');
    root.classList.remove('dark');
  }, []);

  const value = {
    theme: 'light',
    setTheme: () => {},
    toggleTheme: () => {},
    isDark: false,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export default ThemeProvider;
