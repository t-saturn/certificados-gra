'use client';

import type { FC } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useCallback, memo } from 'react';
import { Menu, X } from 'lucide-react';
import type { HeaderProps, NavigationItem } from '@/types/landing.types';
import { ThemeToggle } from '@/components/ui/theme-toggle';

const NavLink: FC<{ item: NavigationItem }> = memo(({ item }) => {
  const linkClasses =
    'relative px-4 py-2 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-primary after:absolute after:bottom-0 after:left-1/2 after:h-0.5 after:w-0 after:bg-primary after:transition-all after:duration-200 after:-translate-x-1/2 hover:after:w-full';

  if (item.isExternal) {
    return (
      <a href={item.href} target="_blank" rel="noopener noreferrer" className={linkClasses}>
        {item.label}
      </a>
    );
  }

  return (
    <Link href={item.href} className={linkClasses} prefetch={false}>
      {item.label}
    </Link>
  );
});

NavLink.displayName = 'NavLink';

export const Header: FC<HeaderProps> = memo(({ logoSrc, logoAlt, navigationItems }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen((prev) => !prev);
  }, []);

  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between lg:h-20">
          <Link href="/" className="flex items-center gap-3" prefetch={false}>
            <Image src={logoSrc} alt={logoAlt} width={48} height={48} className="h-12 w-auto lg:h-14" priority quality={85} />
            <div className="hidden flex-col sm:flex">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">Gobierno Regional</span>
              <span className="text-sm font-bold text-foreground">Ayacucho</span>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Navegación principal">
            {navigationItems.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <ThemeToggle />
            <Link
              href="/login"
              className="px-6 py-2.5 text-sm font-semibold bg-primary text-primary-foreground rounded-full transition-all duration-200 hover:bg-primary/90 hover:shadow-lg active:scale-95"
              prefetch={false}
            >
              Iniciar Sesión
            </Link>
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <ThemeToggle />
            <button
              type="button"
              onClick={toggleMobileMenu}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors duration-200 hover:bg-primary hover:text-primary-foreground"
              aria-label={isMobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-menu"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      <div
        id="mobile-menu"
        className={`fixed inset-0 top-16 z-40 lg:hidden bg-background transition-all duration-300 lg:top-20 ${isMobileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}
        aria-hidden={!isMobileMenuOpen}
      >
        <nav className="flex flex-col gap-2 p-6" aria-label="Navegación móvil">
          {navigationItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeMobileMenu}
              className="px-4 py-3 text-base font-medium text-foreground rounded-md transition-colors duration-200 hover:bg-muted hover:text-primary"
              prefetch={false}
            >
              {item.label}
            </Link>
          ))}
          <Link href="/login" className="mt-4 px-6 py-3 text-center text-base font-semibold bg-primary text-primary-foreground rounded-full transition-all duration-200 hover:bg-primary/90" prefetch={false}>
            Iniciar Sesión
          </Link>
        </nav>
      </div>
    </header>
  );
});

Header.displayName = 'Header';
