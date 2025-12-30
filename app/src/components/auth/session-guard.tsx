'use client';

import type { FC, ReactNode, JSX } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useEffect, useCallback } from 'react';
import type { ExtendedSession } from '@/types/auth.types';

type SessionGuardProps = {
  children: ReactNode;
};

const SessionGuard: FC<SessionGuardProps> = ({ children }): JSX.Element | null => {
  const { data, status, update } = useSession();
  const session = data as ExtendedSession | null;

  const redirectToKeycloak = useCallback((): void => {
    signIn('keycloak', { callbackUrl: '/main' });
  }, []);

  useEffect(() => {
    if (session?.error === 'RefreshAccessTokenError') {
      redirectToKeycloak();
    }
  }, [session?.error, redirectToKeycloak]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirectToKeycloak();
    }
  }, [status, redirectToKeycloak]);

  useEffect(() => {
    const interval = setInterval(() => {
      update();
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, [update]);

  useEffect(() => {
    const handleVisibilityChange = (): void => {
      if (document.visibilityState === 'visible') {
        update();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [update]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated' || session?.error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Redirigiendo al SSO...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default SessionGuard;
