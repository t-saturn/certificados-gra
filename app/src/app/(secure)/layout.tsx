import RoleGuard from '@/components/auth/role-guard';
import SessionGuard from '@/components/auth/session-guard';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ProfileProvider } from '@/context/profile';
import LayoutClient from '@/components/layout/layout';

export const dynamic = 'force-dynamic';

const ProtectedLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <SessionGuard>
      <RoleGuard>
        <ProfileProvider>
          <SidebarProvider>
            <LayoutClient>{children}</LayoutClient>
          </SidebarProvider>
        </ProfileProvider>
      </RoleGuard>
    </SessionGuard>
  );
};

export default ProtectedLayout;
