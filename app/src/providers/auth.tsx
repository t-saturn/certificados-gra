'use client';

import { SessionProvider, useSession, signOut } from 'next-auth/react';
import { useEffect, useRef } from 'react';
import { verifyKeycloakSession } from '@/actions/auth/fn-verify-session';

function SessionWatcher({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const isVerifying = useRef(false);

  useEffect(() => {
    if (status === 'authenticated') {
      const verifySession = async () => {
        if (isVerifying.current) return;

        isVerifying.current = true;

        try {
          const result = await verifyKeycloakSession();

          if (!result.valid) {
            console.log('Sesión inválida en Keycloak, cerrando...', result.reason);
            await signOut({ callbackUrl: '/', redirect: true });
          }
        } catch (error) {
          console.error('Error verificando sesión:', error);
        } finally {
          isVerifying.current = false;
        }
      };

      // Verificar inmediatamente
      verifySession();

      // Verificar cada 10 segundos
      const interval = setInterval(verifySession, 10000);

      // Verificar cuando la ventana recupera el foco
      const handleFocus = () => verifySession();
      window.addEventListener('focus', handleFocus);

      return () => {
        clearInterval(interval);
        window.removeEventListener('focus', handleFocus);
      };
    }
  }, [status]);

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SessionWatcher>{children}</SessionWatcher>
    </SessionProvider>
  );
}
