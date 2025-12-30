'use client';

import { createContext, useContext } from 'react';
import type { SidebarMenuGroup } from '@/types/sidebar-types.';

export interface ModuleInfo {
  id: string;
  item?: string | null;
  name: string;
  route?: string | null;
  icon?: string | null;
  parent_id?: string | null;
  sort_order: number;
  status: string;
  children?: { id: string; name: string }[];
}

export type RoleValue = {
  id: string;
  name: string;
  modules: ModuleInfo[];
  sidebarMenu?: SidebarMenuGroup[];
} | null;

const RoleContext = createContext<RoleValue>(null);

export const RoleProvider = ({ value, children }: { value: RoleValue; children: React.ReactNode }) => <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;

export const useRole = () => useContext(RoleContext);
