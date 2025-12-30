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

// Type guard real
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
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-elevated">
        <div className="h-5 w-5 animate-pulse rounded-full bg-border" />
      </div>
    );
  }

  // theme puede ser "system", entonces usamos resolvedTheme
  const raw = theme === 'system' ? resolvedTheme : theme;

  // fallback garantizado
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
      className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-elevated text-text-secondary transition-all duration-200 hover:bg-primary hover:text-text-inverse hover:scale-105 active:scale-95"
      aria-label={label}
      title={label}
    >
      {icon}
    </button>
  );
};
