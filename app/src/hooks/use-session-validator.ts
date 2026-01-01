'use client';

import { useSession, signIn } from 'next-auth/react';
import { useEffect, useCallback, useRef } from 'react';
import type { ExtendedSession } from '@/types/auth.types';

type UseSessionValidatorOptions = {
  pollingInterval?: number;
  onSessionInvalid?: () => void;
};

type SessionValidatorResult = {
  session: ExtendedSession | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
  isValidating: boolean;
};

export const useSessionValidator = (options: UseSessionValidatorOptions = {}): SessionValidatorResult => {
  const { pollingInterval = 2000, onSessionInvalid } = options;
  const { data, status, update } = useSession();
  const session = data as ExtendedSession | null;
  const isValidatingRef = useRef(false);
  const lastCheckRef = useRef<number>(0);

  const validateSession = useCallback(async (): Promise<void> => {
    if (isValidatingRef.current) return;
    if (status !== 'authenticated') return;
    if (!session?.accessToken) return;

    const now = Date.now();
    if (now - lastCheckRef.current < 5000) return;

    isValidatingRef.current = true;
    lastCheckRef.current = now;

    try {
      const response = await fetch('/api/auth/validate-session');
      const result = (await response.json()) as { valid: boolean };

      if (!result.valid) {
        onSessionInvalid?.();
        signIn('keycloak', { callbackUrl: '/main' });
      }
    } catch {
      await update();
    } finally {
      isValidatingRef.current = false;
    }
  }, [session?.accessToken, status, update, onSessionInvalid]);

  useEffect(() => {
    if (status !== 'authenticated') return;

    const interval = setInterval(validateSession, pollingInterval);
    return () => clearInterval(interval);
  }, [status, pollingInterval, validateSession]);

  useEffect(() => {
    const handleVisibilityChange = (): void => {
      if (document.visibilityState === 'visible') {
        validateSession();
      }
    };

    const handleFocus = (): void => {
      validateSession();
    };

    const handleUserInteraction = (): void => {
      const now = Date.now();
      if (now - lastCheckRef.current > 30000) {
        validateSession();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('click', handleUserInteraction);
    window.addEventListener('keydown', handleUserInteraction);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('click', handleUserInteraction);
      window.removeEventListener('keydown', handleUserInteraction);
    };
  }, [validateSession]);

  useEffect(() => {
    if (status === 'authenticated') {
      validateSession();
    }
  }, [status, validateSession]);

  return {
    session,
    status,
    isValidating: isValidatingRef.current,
  };
};
