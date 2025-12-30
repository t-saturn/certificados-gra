'use client';

import type { FC, JSX } from 'react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';

type ThemeKey = 'light' | 'dark' | 'system';

const THEME_META: Record<ThemeKey, { label: string; icon: JSX.Element }> = {
  light: { label: 'Modo claro', icon: <Sun className="h-5 w-5" /> },
  dark: { label: 'Modo oscuro', icon: <Moon className="h-5 w-5" /> },
  system: { label: 'Modo sistema', icon: <Monitor className="h-5 w-5" /> },
};

const NEXT_THEME: Record<ThemeKey, ThemeKey> = {
  light: 'dark',
  dark: 'system',
  system: 'light',
};

const isThemeKey = (value: unknown): value is ThemeKey => value === 'light' || value === 'dark' || value === 'system';

export const ThemeToggle: FC = (): JSX.Element | null => {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  if (!mounted) {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
        <div className="h-5 w-5 animate-pulse rounded-full bg-border" />
      </div>
    );
  }

  const raw = theme === 'system' ? resolvedTheme : theme;
  const key: ThemeKey = isThemeKey(raw) ? raw : 'system';
  const { icon, label } = THEME_META[key];

  const cycleTheme = (): void => {
    const current: ThemeKey = isThemeKey(theme) ? theme : 'system';
    setTheme(NEXT_THEME[current]);
  };

  return (
    <button
      type="button"
      onClick={cycleTheme}
      className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground transition-all duration-200 hover:bg-primary hover:text-primary-foreground hover:scale-105 active:scale-95"
      aria-label={label}
      title={label}
    >
      {icon}
    </button>
  );
};
