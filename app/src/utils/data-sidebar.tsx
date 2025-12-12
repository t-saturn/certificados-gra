import { SidebarMenuGroup } from '@/types/sidebar-types';
import { LayoutDashboard, FileSpreadsheet, ShieldCheck, Settings, Signature, Calendar, ChartSpline } from 'lucide-react';

export const baseMenus: SidebarMenuGroup[] = [
  {
    title: 'Menú',
    menu: [
      {
        label: 'Panel Principal',
        icon: LayoutDashboard,
        url: '/main',
        roles: ['default', 'org', 'admin'],
      },
      {
        label: 'Eventos',
        icon: Calendar,
        url: '/main/events',
        roles: ['org', 'admin'],
      },
      {
        label: 'Plantillas',
        icon: FileSpreadsheet,
        url: '/main/templates',
        roles: ['org', 'admin'],
      },
      {
        label: 'Documents',
        icon: Signature,
        url: '/main/documents',
        roles: ['default', 'org', 'admin'],
      },
      {
        label: 'Reportes',
        icon: ChartSpline,
        url: '/main/reports',
        roles: ['org', 'admin'],
      },
      {
        label: 'Auditoría',
        icon: ShieldCheck,
        url: '/main/audit',
        roles: ['admin'],
      },
      {
        label: 'Configuración',
        icon: Settings,
        url: '/main/settings',
        roles: ['org', 'admin'],
      },
    ],
  },
];
