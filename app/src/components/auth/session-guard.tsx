'use client';
import { to_cb64 } from '@/helpers';
import { useSession } from 'next-auth/react';
import { useEffect } from 'react';

const AUTH_ORIGIN = process.env.NEXT_PUBLIC_AUTH_ORIGIN!;
const APP_ORIGIN = process.env.NEXT_PUBLIC_APP_ORIGIN!;

const buildReturnUrl = (): string => {
  const current = typeof window !== 'undefined' ? window.location.href : `${APP_ORIGIN}/`;
  try {
    const u = new URL(current);
    const appBase = new URL(APP_ORIGIN);
    if (u.origin !== appBase.origin) return `${APP_ORIGIN}${u.pathname}${u.search}${u.hash}`;

    return u.toString();
  } catch {
    return `${APP_ORIGIN}${current.startsWith('/') ? '' : '/'}${current}`;
  }
};

function goToSignIn(returnToAbs: string) {
  const cb64 = to_cb64(returnToAbs);
  const signInUrl = `${AUTH_ORIGIN}/auth/signin?cb64=${cb64}`;

  window.location.replace(signInUrl);
}

const SessionGuard = ({ children }: { children: React.ReactNode }) => {
  const { status } = useSession();

  useEffect(() => {
    if (status !== 'authenticated') {
      const returnTo = buildReturnUrl();
      goToSignIn(returnTo);
    }
  }, [status]);

  if (status === 'loading') return null;
  return <>{children}</>;
};

export default SessionGuard;
