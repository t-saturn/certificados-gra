import { SidebarItem, SidebarMenuGroup } from '@/types/sidebar-types';
import { baseMenus } from '@/utils/data-sidebar';

export const fn_get_sidebar_menu = (role: string): SidebarMenuGroup[] => {
  return baseMenus
    .map((group) => {
      const filteredMenu = group.menu.filter((item: SidebarItem) => {
        if (!item.roles) return true;
        return item.roles.includes(role);
      });

      if (filteredMenu.length === 0) return null;
      return { ...group, menu: filteredMenu };
    })
    .filter(Boolean) as SidebarMenuGroup[];
};
