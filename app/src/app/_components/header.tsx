'use client';

import type { FC, JSX } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import type { HeaderProps, NavigationItem } from '@/types/landing.types';
import { ThemeToggle } from '@/components/ui/theme-toggle';

const NavLink: FC<{ item: NavigationItem }> = ({ item }): JSX.Element => {
  const linkClasses: string =
    'relative px-4 py-2 text-sm font-medium text-text-secondary transition-colors duration-200 hover:text-primary after:absolute after:bottom-0 after:left-1/2 after:h-0.5 after:w-0 after:bg-primary after:transition-all after:duration-200 after:-translate-x-1/2 hover:after:w-full';

  if (item.isExternal) {
    return (
      <a href={item.href} target="_blank" rel="noopener noreferrer" className={linkClasses}>
        {item.label}
      </a>
    );
  }

  return (
    <Link href={item.href} className={linkClasses}>
      {item.label}
    </Link>
  );
};

export const Header: FC<HeaderProps> = ({ logoSrc, logoAlt, navigationItems }): JSX.Element => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  const toggleMobileMenu = (): void => {
    setIsMobileMenuOpen((prev: boolean): boolean => !prev);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-effect border-b border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <Image src={logoSrc} alt={logoAlt} width={56} height={56} className="h-14 w-auto" priority />
            <div className="hidden flex-col sm:flex">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">Gobierno Regional</span>
              <span className="text-sm font-bold text-text-primary">Ayacucho</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-1 lg:flex">
            {navigationItems.map(
              (item: NavigationItem): JSX.Element => (
                <NavLink key={item.href} item={item} />
              ),
            )}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden items-center gap-3 lg:flex">
            {/* Theme Toggle */}
            <ThemeToggle />

            {/* CTA Button */}
            <Link
              href="/login"
              className="px-6 py-2.5 text-sm font-semibold bg-primary text-text-inverse rounded-full transition-all duration-200 hover:bg-primary-dark hover:shadow-lg hover:shadow-primary/25 active:scale-95"
            >
              Iniciar Sesión
            </Link>
          </div>

          {/* Mobile Actions */}
          <div className="flex items-center gap-2 lg:hidden">
            <ThemeToggle />
            <button
              type="button"
              onClick={toggleMobileMenu}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-elevated text-text-secondary transition-colors duration-200 hover:bg-primary hover:text-text-inverse"
              aria-label={isMobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div className={`fixed inset-0 top-20 z-40 lg:hidden bg-background transition-all duration-300 ${isMobileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
        <nav className="flex flex-col gap-2 p-6">
          {navigationItems.map(
            (item: NavigationItem): JSX.Element => (
              <Link
                key={item.href}
                href={item.href}
                onClick={(): void => setIsMobileMenuOpen(false)}
                className="px-4 py-3 text-base font-medium text-text-primary rounded-md transition-colors duration-200 hover:bg-surface-elevated hover:text-primary"
              >
                {item.label}
              </Link>
            ),
          )}
          <Link href="/login" className="mt-4 px-6 py-3 text-center text-base font-semibold bg-primary text-text-inverse rounded-full transition-all duration-200 hover:bg-primary-dark">
            Iniciar Sesión
          </Link>
        </nav>
      </div>
    </header>
  );
};
