import { SidebarMenuGroup } from '@/types/sidebar-types';
import { LayoutDashboard, Settings2, UserCircle } from 'lucide-react';

export const baseMenus: SidebarMenuGroup[] = [
  {
    title: 'Menú',
    menu: [
      {
        label: 'Dashboard',
        icon: LayoutDashboard,
        url: '/main',
        roles: ['user', 'admin'],
      },
    ],
  },

  {
    title: 'Configuración',
    menu: [
      {
        label: 'Ajustes',
        icon: Settings2,
        url: '/main/settings',
        roles: ['admin'],
      },
      {
        label: 'Cuenta',
        icon: UserCircle,
        url: '/main/account',
        roles: ['admin'],
      },
    ],
  },
];
