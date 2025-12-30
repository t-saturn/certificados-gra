'use client';

import type { FC, JSX } from 'react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';

export const ThemeToggle: FC = (): JSX.Element | null => {
  const [mounted, setMounted] = useState<boolean>(false);
  const { theme, setTheme } = useTheme();

  useEffect((): void => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-elevated">
        <div className="h-5 w-5 animate-pulse rounded-full bg-border" />
      </div>
    );
  }

  const cycleTheme = (): void => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  const getIcon = (): JSX.Element => {
    switch (theme) {
      case 'light':
        return <Sun className="h-5 w-5" />;
      case 'dark':
        return <Moon className="h-5 w-5" />;
      default:
        return <Monitor className="h-5 w-5" />;
    }
  };

  const getLabel = (): string => {
    switch (theme) {
      case 'light':
        return 'Modo claro';
      case 'dark':
        return 'Modo oscuro';
      default:
        return 'Modo sistema';
    }
  };

  return (
    <button
      type="button"
      onClick={cycleTheme}
      className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-elevated text-text-secondary transition-all duration-200 hover:bg-primary hover:text-text-inverse hover:scale-105 active:scale-95"
      aria-label={getLabel()}
      title={getLabel()}
    >
      {getIcon()}
    </button>
  );
};
