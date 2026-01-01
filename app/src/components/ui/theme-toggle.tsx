'use client';

import type { FC } from 'react';
import { useTheme } from 'next-themes';
import { useEffect, useState, useCallback, memo } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';

type ThemeKey = 'light' | 'dark' | 'system';

const THEME_META: Record<ThemeKey, { label: string; Icon: typeof Sun }> = {
  light: { label: 'Modo claro', Icon: Sun },
  dark: { label: 'Modo oscuro', Icon: Moon },
  system: { label: 'Modo sistema', Icon: Monitor },
};

const NEXT_THEME: Record<ThemeKey, ThemeKey> = {
  light: 'dark',
  dark: 'system',
  system: 'light',
};

const isThemeKey = (value: unknown): value is ThemeKey => value === 'light' || value === 'dark' || value === 'system';

export const ThemeToggle: FC = memo(() => {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const cycleTheme = useCallback(() => {
    const current: ThemeKey = isThemeKey(theme) ? theme : 'system';
    setTheme(NEXT_THEME[current]);
  }, [theme, setTheme]);

  if (!mounted) {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
        <div className="h-5 w-5 animate-pulse rounded-full bg-border" />
      </div>
    );
  }

  const raw = theme === 'system' ? resolvedTheme : theme;
  const key: ThemeKey = isThemeKey(raw) ? raw : 'system';
  const { label, Icon } = THEME_META[key];

  return (
    <button
      type="button"
      onClick={cycleTheme}
      className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground transition-all duration-200 hover:bg-primary hover:text-primary-foreground hover:scale-105 active:scale-95"
      aria-label={label}
      title={label}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
});

ThemeToggle.displayName = 'ThemeToggle';
