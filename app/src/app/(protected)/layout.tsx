import type { FC, ReactNode, JSX } from 'react';
import { SessionProvider } from '@/components/providers/session-provider';
import SessionGuard from '@/components/auth/session-guard';
import RoleGuard from '@/components/auth/role-guard';

type ProtectedLayoutProps = {
  children: ReactNode;
};

const ProtectedLayout: FC<ProtectedLayoutProps> = ({ children }): JSX.Element => {
  return (
    <SessionProvider>
      <SessionGuard>
        <RoleGuard>{children}</RoleGuard>
      </SessionGuard>
    </SessionProvider>
  );
};

export default ProtectedLayout;
