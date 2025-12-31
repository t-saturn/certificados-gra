'use client';

import type { FC, ReactNode, JSX } from 'react';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { RoleProvider } from '@/components/providers/role-provider';
import { ProfileProvider } from '@/components/providers/profile-provider';
import { LayoutClient } from '@/components/layout/layout-client';
import { fn_get_user_role } from '@/actions/auth/fn_get_user_role';
import { buildSidebarMenu, extractRoutes, isRouteAllowed } from '@/lib/build-sidebar-menu';
import type { ModuleDTO, SidebarMenuGroup } from '@/types/role.types';
import type { ExtendedSession } from '@/types/auth.types';
import type { UserProfile } from '@/types/profile.types';

type RoleState = {
  roleId: string;
  roleName: string;
  modules: ModuleDTO[];
  sidebarMenu: SidebarMenuGroup[];
  allowedRoutes: string[];
} | null;

type RoleGuardProps = {
  children: ReactNode;
};

const RoleGuard: FC<RoleGuardProps> = ({ children }): JSX.Element | null => {
  const router = useRouter();
  const pathname = usePathname();
  const { data } = useSession();
  const session = data as ExtendedSession | null;
  const [role, setRole] = useState<RoleState | 'loading'>('loading');
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const modulesRef = useRef<ModuleDTO[] | null>(null);
  const isFetchingRef = useRef<boolean>(false);

  const fetchRole = useCallback(async (): Promise<void> => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      const data = await fn_get_user_role();

      if (!data.modules || data.modules.length === 0) {
        router.replace('/unauthorized');
        return;
      }

      modulesRef.current = data.modules;

      const allowedRoutes = extractRoutes(data.modules);
      const allowed = isRouteAllowed(pathname, allowedRoutes);

      if (!allowed) {
        router.replace('/unauthorized');
        setIsAuthorized(false);
        return;
      }

      setIsAuthorized(true);

      const sidebarMenu = buildSidebarMenu(data.modules);

      setRole({
        roleId: data.role_id,
        roleName: data.role_name,
        modules: data.modules,
        sidebarMenu,
        allowedRoutes,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '';

      if (message.includes('No autenticado')) {
        router.replace('/');
        return;
      }

      router.replace('/unauthorized');
    } finally {
      isFetchingRef.current = false;
    }
  }, [pathname, router]);

  useEffect(() => {
    if (modulesRef.current) {
      const allowedRoutes = extractRoutes(modulesRef.current);
      const allowed = isRouteAllowed(pathname, allowedRoutes);

      if (!allowed) {
        router.replace('/unauthorized');
        setIsAuthorized(false);
        return;
      }

      setIsAuthorized(true);
    } else {
      setIsAuthorized(false);
      fetchRole();
    }
  }, [pathname, router, fetchRole]);

  if (role === 'loading' || !isAuthorized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  if (role === null) {
    return null;
  }

  const userProfile: UserProfile = {
    id: session?.user?.id ?? '',
    name: session?.user?.name ?? 'Usuario',
    email: session?.user?.email ?? '',
    image: session?.user?.image,
    roles: session?.user?.roles,
  };

  return (
    <RoleProvider value={role}>
      <ProfileProvider user={userProfile} roleName={role.roleName}>
        <LayoutClient>{children}</LayoutClient>
      </ProfileProvider>
    </RoleProvider>
  );
};

export default RoleGuard;
