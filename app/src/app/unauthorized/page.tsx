'use client';

import type { FC, JSX } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { keycloakSignOut } from '@/lib/keycloak-logout';

const UnauthorizedPage: FC = (): JSX.Element => {
  const handleChangeAccount = async (): Promise<void> => {
    await keycloakSignOut();
  };

  return (
    <main className="relative min-h-screen bg-background overflow-hidden flex items-center justify-center">
      <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-destructive/5 blur-3xl" aria-hidden="true" />
      <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-chart-2/10 blur-3xl" aria-hidden="true" />

      <div className="relative z-10 mx-auto max-w-lg px-4 text-center">
        <div className="mb-8">
          <Link href="/" className="inline-block">
            <Image src="/img/logo.webp" alt="Gobierno Regional de Ayacucho" width={80} height={80} className="h-20 w-auto mx-auto" />
          </Link>
        </div>

        <div className="mb-6 flex justify-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-destructive/10">
            <svg className="h-12 w-12 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
        </div>

        <h1 className="mb-4 text-3xl font-bold text-foreground" style={{ fontFamily: 'var(--font-montserrat)' }}>
          Acceso No Autorizado
        </h1>

        <p className="mb-8 text-muted-foreground">No tienes permisos para acceder a esta sección. Si crees que esto es un error, contacta al administrador del sistema o intenta con otra cuenta.</p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-4 text-base font-semibold text-primary-foreground transition-all duration-200 hover:bg-primary/90 hover:shadow-xl active:scale-95"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            Ir al Inicio
          </Link>

          <button
            type="button"
            onClick={handleChangeAccount}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border-2 border-border bg-transparent px-8 py-4 text-base font-semibold text-foreground transition-all duration-200 hover:border-primary hover:text-primary hover:bg-primary/5 active:scale-95"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Cambiar de Cuenta
          </button>
        </div>

        <div className="mt-12 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground mb-4">¿Necesitas ayuda?</p>
          <a href="mailto:certificaciones@regionayacucho.gob.pe" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
              />
            </svg>
            certificaciones@regionayacucho.gob.pe
          </a>
        </div>
      </div>
    </main>
  );
};

export default UnauthorizedPage;
