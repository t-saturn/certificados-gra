'use client';

import type { FC, JSX } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { keycloakSignOut } from '@/lib/keycloak-logout';

export const AuthButtons: FC = (): JSX.Element => {
  const { data: session } = useSession();

  if (!session) {
    return (
      <button
        type="button"
        onClick={() => signIn('keycloak', { callbackUrl: '/main' })}
        className="px-6 py-2.5 text-sm font-semibold bg-primary text-primary-foreground rounded-full transition-all duration-200 hover:bg-primary/90 hover:shadow-lg active:scale-95"
      >
        Iniciar Sesión
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => keycloakSignOut()}
      className="inline-flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>
      Cerrar sesión
    </button>
  );
};
