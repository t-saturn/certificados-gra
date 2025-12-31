import type { ModuleDTO, SidebarMenuGroup, SidebarMenuItem } from '@/types/role.types';
import { getIcon } from './icon-map';

export const buildSidebarMenu = (modules: ModuleDTO[]): SidebarMenuGroup[] => {
  const moduleMap = new Map<string, ModuleDTO>();
  modules.forEach((m) => moduleMap.set(m.id, m));

  const rootModules = modules.filter((m) => !m.parent_id || m.parent_id === m.id);

  const groupMap = new Map<string, ModuleDTO[]>();

  rootModules.forEach((m) => {
    const groupTitle = m.item || 'General';
    if (!groupMap.has(groupTitle)) {
      groupMap.set(groupTitle, []);
    }
    groupMap.get(groupTitle)!.push(m);
  });

  const result: SidebarMenuGroup[] = [];

  const groupOrder = ['Menú', 'Gestión', 'Seguridad', 'Configuración'];

  const sortedGroups = Array.from(groupMap.entries()).sort(([a], [b]) => {
    const indexA = groupOrder.indexOf(a);
    const indexB = groupOrder.indexOf(b);
    if (indexA === -1 && indexB === -1) return a.localeCompare(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  sortedGroups.forEach(([title, groupModules]) => {
    const sortedModules = groupModules.sort((a, b) => a.sort_order - b.sort_order);

    const menuItems: SidebarMenuItem[] = sortedModules.map((m) => {
      const menuItem: SidebarMenuItem = {
        label: m.name,
        icon: getIcon(m.icon),
        url: m.route || '/main',
      };

      const children = modules.filter((child) => child.parent_id === m.id && child.id !== m.id);

      if (children.length > 0) {
        const sortedChildren = children.sort((a, b) => a.sort_order - b.sort_order);

        menuItem.items = sortedChildren.map((child) => ({
          label: child.name,
          icon: getIcon(child.icon),
          url: child.route || '/main',
        }));
      }

      return menuItem;
    });

    result.push({
      title,
      menu: menuItems,
    });
  });

  return result;
};

export const extractRoutes = (modules: ModuleDTO[]): string[] => {
  const routes = new Set<string>();

  const extract = (mods: ModuleDTO[]): void => {
    for (const mod of mods) {
      if (mod.route) {
        const normalizedRoute = mod.route.endsWith('/') && mod.route !== '/' ? mod.route.slice(0, -1) : mod.route;
        routes.add(normalizedRoute);
      }
      if (mod.children && mod.children.length > 0) {
        extract(mod.children);
      }
    }
  };

  extract(modules);
  return Array.from(routes);
};

export const isRouteAllowed = (pathname: string, allowedRoutes: string[]): boolean => {
  const normalizedPath = pathname.endsWith('/') && pathname !== '/' ? pathname.slice(0, -1) : pathname;

  if (normalizedPath === '/main') {
    return true;
  }

  for (const route of allowedRoutes) {
    if (normalizedPath === route) return true;
    if (normalizedPath.startsWith(route + '/')) return true;
  }

  return false;
};
