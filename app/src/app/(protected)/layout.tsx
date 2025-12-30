import type { FC, ReactNode, JSX } from 'react';
import { SessionProvider } from '@/components/providers/session-provider';
import SessionGuard from '@/components/auth/session-guard';

type ProtectedLayoutProps = {
  children: ReactNode;
};

const ProtectedLayout: FC<ProtectedLayoutProps> = ({ children }): JSX.Element => {
  return (
    <SessionProvider>
      <SessionGuard>{children}</SessionGuard>
    </SessionProvider>
  );
};

export default ProtectedLayout;
