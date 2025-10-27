'use client';

import { SessionProvider } from 'next-auth/react';
import type { Session } from 'next-auth';

const AuthProvider = ({ children, session }: { children: React.ReactNode; session?: Session | null }) => {
  return (
    <SessionProvider session={session} refetchOnWindowFocus={true} refetchInterval={5}>
      {children}
    </SessionProvider>
  );
};

export default AuthProvider;
