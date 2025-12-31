export type ModuleDTO = {
  id: string;
  item: string;
  name: string;
  route: string;
  icon: string;
  parent_id: string | null;
  sort_order: number;
  status: string;
  permission_type: string;
  children?: ModuleDTO[];
};

export type UserRoleResponse = {
  role_id: string;
  role_name: string;
  modules: ModuleDTO[];
};

export type SidebarMenuItem = {
  id: string;
  name: string;
  route: string;
  icon: string;
  children?: SidebarMenuItem[];
};

export type RoleContextValue = {
  roleId: string;
  roleName: string;
  modules: ModuleDTO[];
  sidebarMenu: SidebarMenuItem[];
  allowedRoutes: string[];
  // eslint-disable-next-line no-unused-vars
  hasAccess: (route: string) => boolean;
};
