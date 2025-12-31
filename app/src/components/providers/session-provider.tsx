'use client';

import type { FC, ReactNode, JSX } from 'react';
import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';

type SessionProviderProps = {
  children: ReactNode;
};

export const SessionProvider: FC<SessionProviderProps> = ({ children }): JSX.Element => {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
};
