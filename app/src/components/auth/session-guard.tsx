'use client';

import type { FC, ReactNode, JSX } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useEffect } from 'react';
import type { ExtendedSession } from '@/types/auth.types';

type SessionGuardProps = {
  children: ReactNode;
};

const SessionGuard: FC<SessionGuardProps> = ({ children }): JSX.Element | null => {
  const { data, status } = useSession();
  const session = data as ExtendedSession | null;

  useEffect(() => {
    if (session?.error === 'RefreshAccessTokenError') {
      signIn('keycloak', { callbackUrl: '/main' });
    }
  }, [session]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      signIn('keycloak', { callbackUrl: '/main' });
    }
  }, [status]);

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

  if (status === 'unauthenticated') {
    return null;
  }

  return <>{children}</>;
};

export default SessionGuard;
