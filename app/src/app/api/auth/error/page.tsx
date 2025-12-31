'use client';

import type { FC, JSX } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Suspense } from 'react';

const errorMessages: Record<string, { title: string; description: string }> = {
  Configuration: {
    title: 'Error de Configuración',
    description: 'Hay un problema con la configuración del servidor de autenticación. Contacta al administrador.',
  },
  AccessDenied: {
    title: 'Acceso Denegado',
    description: 'No tienes permisos para acceder a este recurso.',
  },
  Verification: {
    title: 'Error de Verificación',
    description: 'El enlace de verificación ha expirado o ya fue utilizado.',
  },
  OAuthSignin: {
    title: 'Error de Inicio de Sesión',
    description: 'Error al iniciar el proceso de autenticación con el proveedor.',
  },
  OAuthCallback: {
    title: 'Error de Callback',
    description: 'Error al procesar la respuesta del proveedor de autenticación.',
  },
  OAuthCreateAccount: {
    title: 'Error al Crear Cuenta',
    description: 'No se pudo crear la cuenta de usuario.',
  },
  Callback: {
    title: 'Error de Autenticación',
    description: 'Error en el proceso de autenticación.',
  },
  Default: {
    title: 'Error de Autenticación',
    description: 'Ha ocurrido un error inesperado durante la autenticación.',
  },
};

const AuthErrorContent: FC = (): JSX.Element => {
  const searchParams = useSearchParams();
  const error = searchParams.get('error') ?? 'Default';
  const errorInfo = errorMessages[error] ?? errorMessages.Default;

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
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>
        </div>

        <h1 className="mb-4 text-3xl font-bold text-foreground" style={{ fontFamily: 'var(--font-montserrat)' }}>
          {errorInfo.title}
        </h1>

        <p className="mb-4 text-muted-foreground">{errorInfo.description}</p>

        <div className="mb-8 rounded-lg bg-muted p-4">
          <p className="text-sm text-muted-foreground">
            Código de error: <code className="font-mono text-destructive">{error}</code>
          </p>
        </div>

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
            onClick={() => window.location.reload()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border-2 border-border bg-transparent px-8 py-4 text-base font-semibold text-foreground transition-all duration-200 hover:border-primary hover:text-primary hover:bg-primary/5 active:scale-95"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reintentar
          </button>
        </div>

        <div className="mt-12 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground mb-4">¿El problema persiste?</p>
          <a href="mailto:certificaciones@regionayacucho.gob.pe" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
              />
            </svg>
            Contactar Soporte
          </a>
        </div>
      </div>
    </main>
  );
};

const AuthErrorPage: FC = (): JSX.Element => {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      }
    >
      <AuthErrorContent />
    </Suspense>
  );
};

export default AuthErrorPage;
