import type { ModuleDTO, SidebarMenuItem } from '@/types/role.types';

export const buildSidebarMenu = (modules: ModuleDTO[]): SidebarMenuItem[] => {
  const moduleMap = new Map<string, ModuleDTO & { children: ModuleDTO[] }>();

  modules.forEach((mod) => {
    moduleMap.set(mod.id, { ...mod, children: [] });
  });

  const rootItems: SidebarMenuItem[] = [];

  modules.forEach((mod) => {
    const currentModule = moduleMap.get(mod.id)!;

    if (mod.parent_id === null) {
      rootItems.push({
        id: currentModule.id,
        name: currentModule.name,
        route: currentModule.route,
        icon: currentModule.icon,
        children: [],
      });
    } else {
      const parent = moduleMap.get(mod.parent_id);
      if (parent) {
        parent.children.push(currentModule);
      }
    }
  });

  const buildChildren = (parentId: string): SidebarMenuItem[] => {
    const parent = moduleMap.get(parentId);
    if (!parent || parent.children.length === 0) return [];

    return parent.children
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((child) => ({
        id: child.id,
        name: child.name,
        route: child.route,
        icon: child.icon,
        children: buildChildren(child.id),
      }));
  };

  return rootItems
    .sort((a, b) => {
      const modA = moduleMap.get(a.id);
      const modB = moduleMap.get(b.id);
      return (modA?.sort_order ?? 0) - (modB?.sort_order ?? 0);
    })
    .map((item) => ({
      ...item,
      children: buildChildren(item.id),
    }));
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
