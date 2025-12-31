'use client';

import type { FC, JSX } from 'react';
import { useTheme } from 'next-themes';
import { useEffect, useState, useRef } from 'react';
import { Sun, Moon, Monitor, ChevronDown } from 'lucide-react';

type ThemeOption = {
  value: string;
  label: string;
  icon: JSX.Element;
};

const themeOptions: ThemeOption[] = [
  { value: 'light', label: 'Claro', icon: <Sun className="h-4 w-4" /> },
  { value: 'dark', label: 'Oscuro', icon: <Moon className="h-4 w-4" /> },
  { value: 'system', label: 'Sistema', icon: <Monitor className="h-4 w-4" /> },
];

export const ThemeToggleDropdown: FC = (): JSX.Element | null => {
  const [mounted, setMounted] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const { theme, setTheme } = useTheme();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect((): (() => void) => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect((): (() => void) => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return (): void => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!mounted) {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-elevated">
        <div className="h-5 w-5 animate-pulse rounded-full bg-border" />
      </div>
    );
  }

  const currentTheme = themeOptions.find((option) => option.value === theme) || themeOptions[2];

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={(): void => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-full bg-surface-elevated px-3 py-2 text-text-secondary transition-all duration-200 hover:bg-primary hover:text-text-inverse"
        aria-label="Cambiar tema"
        aria-expanded={isOpen}
      >
        {currentTheme.icon}
        <span className="hidden text-sm font-medium sm:inline">{currentTheme.label}</span>
        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-40 overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
          {themeOptions.map(
            (option: ThemeOption): JSX.Element => (
              <button
                key={option.value}
                type="button"
                onClick={(): void => {
                  setTheme(option.value);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center gap-3 px-4 py-3 text-sm transition-colors duration-150 hover:bg-surface-elevated ${
                  theme === option.value ? 'bg-primary/10 text-primary' : 'text-text-secondary'
                }`}
              >
                {option.icon}
                <span>{option.label}</span>
                {theme === option.value && <span className="ml-auto h-2 w-2 rounded-full bg-primary" />}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
};
