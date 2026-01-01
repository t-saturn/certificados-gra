import type { SidebarMenuGroup, SidebarMenuItem } from '@/types/sidebar-types.';
import { getIcon } from './icon-map';

interface ModuleDTO {
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

export function buildSidebarMenu(modules: ModuleDTO[]): SidebarMenuGroup[] {
  // 1. Crear mapa de módulos por ID para acceso rápido
  const moduleMap = new Map<string, ModuleDTO>();
  modules.forEach((m) => moduleMap.set(m.id, m));

  // 2. Identificar módulos raíz (sin parent_id o parent_id === su propio id)
  const rootModules = modules.filter((m) => !m.parent_id || m.parent_id === m.id);

  // 3. Agrupar módulos raíz por "item" (título del grupo)
  const groupMap = new Map<string, ModuleDTO[]>();

  rootModules.forEach((m) => {
    const groupTitle = m.item || 'General';
    if (!groupMap.has(groupTitle)) {
      groupMap.set(groupTitle, []);
    }
    groupMap.get(groupTitle)!.push(m);
  });

  // 4. Construir la estructura SidebarMenuGroup[]
  const result: SidebarMenuGroup[] = [];

  // Orden preferido de grupos
  const groupOrder = ['Menú', 'Gestión', 'Seguridad', 'Configuración'];

  // Ordenar grupos
  const sortedGroups = Array.from(groupMap.entries()).sort(([a], [b]) => {
    const indexA = groupOrder.indexOf(a);
    const indexB = groupOrder.indexOf(b);
    if (indexA === -1 && indexB === -1) return a.localeCompare(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  sortedGroups.forEach(([title, groupModules]) => {
    // Ordenar módulos del grupo por sort_order
    const sortedModules = groupModules.sort((a, b) => a.sort_order - b.sort_order);

    const menuItems: SidebarMenuItem[] = sortedModules.map((m) => {
      const menuItem: SidebarMenuItem = {
        label: m.name,
        icon: getIcon(m.icon),
        url: m.route || '/dashboard',
      };

      // Si tiene hijos, buscarlos en el array original de modules
      const children = modules.filter((child) => child.parent_id === m.id && child.id !== m.id);

      if (children.length > 0) {
        // Ordenar hijos por sort_order
        const sortedChildren = children.sort((a, b) => a.sort_order - b.sort_order);

        menuItem.items = sortedChildren.map((child) => ({
          label: child.name,
          icon: getIcon(child.icon),
          url: child.route || '/dashboard',
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
}
