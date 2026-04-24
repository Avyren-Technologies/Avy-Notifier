'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';

// ─── Types ─────────────────────────────────────────────────────────────────────

type ThemeType = 'light' | 'dark' | 'system';

interface ThemeContextProps {
  theme: ThemeType;
  isDarkMode: boolean;
  setTheme: (theme: ThemeType) => void;
  toggleTheme: () => void;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const THEME_KEY = 'avy_theme';

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Resolve the effective dark-mode flag from the chosen theme. */
function resolveIsDark(theme: ThemeType): boolean {
  if (theme === 'system') {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  return theme === 'dark';
}

/** Apply or remove the `dark` class on <html>. */
function applyDarkClass(isDark: boolean): void {
  if (typeof document === 'undefined') return;
  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

// ─── Provider ──────────────────────────────────────────────────────────────────

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [theme, setThemeState] = useState<ThemeType>('system');
  const [isLoading, setIsLoading] = useState(true);

  // Load saved preference on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY) as ThemeType | null;
      if (saved && ['light', 'dark', 'system'].includes(saved)) {
        setThemeState(saved);
      }
    } catch {
      // Ignore localStorage errors
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Sync the dark class whenever `theme` changes
  useEffect(() => {
    if (isLoading) return;
    applyDarkClass(resolveIsDark(theme));
  }, [theme, isLoading]);

  // Listen for OS-level changes when set to "system"
  useEffect(() => {
    if (theme !== 'system') return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => applyDarkClass(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [theme]);

  const setTheme = useCallback((newTheme: ThemeType) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(THEME_KEY, newTheme);
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const isDark = resolveIsDark(theme);

  const toggleTheme = useCallback(() => {
    const nextTheme: ThemeType = resolveIsDark(theme) ? 'light' : 'dark';
    setTheme(nextTheme);
  }, [theme, setTheme]);

  // Don't render children until the saved preference is loaded to avoid flash
  if (isLoading) return null;

  return (
    <ThemeContext.Provider
      value={{ theme, isDarkMode: isDark, setTheme, toggleTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

// ─── Hook ──────────────────────────────────────────────────────────────────────

export const useTheme = (): ThemeContextProps => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
