'use client';

import type { FC, ReactNode, JSX } from 'react';
import { createContext, useContext, useMemo } from 'react';
import type { RoleContextValue, ModuleDTO, SidebarMenuItem } from '@/types/role.types';
import { isRouteAllowed } from '@/lib/build-sidebar-menu';

const RoleContext = createContext<RoleContextValue | null>(null);

type RoleProviderProps = {
  children: ReactNode;
  value: {
    roleId: string;
    roleName: string;
    modules: ModuleDTO[];
    sidebarMenu: SidebarMenuItem[];
    allowedRoutes: string[];
  };
};

export const RoleProvider: FC<RoleProviderProps> = ({ children, value }): JSX.Element => {
  const contextValue = useMemo<RoleContextValue>(
    () => ({
      ...value,
      hasAccess: (route: string) => isRouteAllowed(route, value.allowedRoutes),
    }),
    [value],
  );

  return <RoleContext.Provider value={contextValue}>{children}</RoleContext.Provider>;
};

export const useRole = (): RoleContextValue => {
  const context = useContext(RoleContext);

  if (!context) {
    throw new Error('useRole must be used within a RoleProvider');
  }

  return context;
};
