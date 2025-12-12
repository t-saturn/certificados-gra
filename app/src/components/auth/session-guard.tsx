'use client';

import { useSession, signIn } from 'next-auth/react';
import { useEffect } from 'react';

const SessionGuard = ({ children }: { children: React.ReactNode }) => {
  const { status } = useSession();

  useEffect(() => {
    if (status === 'unauthenticated') {
      // dispara login Keycloak
      signIn('keycloak', { callbackUrl: '/main' });
    }
  }, [status]);

  if (status === 'loading') return null;
  if (status === 'unauthenticated') return null;

  return <>{children}</>;
};

export default SessionGuard;
