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
        roles: ['user', 'admin', 'super_admin'],
      },
      {
        label: 'Eventos',
        icon: Calendar,
        url: '/main/events',
        roles: ['admin', 'super_admin'],
      },
      {
        label: 'Plantillas',
        icon: FileSpreadsheet,
        url: '/main/templates',
        roles: ['admin', 'super_admin'],
      },
      {
        label: 'Certificados',
        icon: Signature,
        url: '/main/certificates',
        roles: ['user', 'admin', 'super_admin'],
      },
      {
        label: 'Reportes',
        icon: ChartSpline,
        url: '/main/reports',
        roles: ['admin', 'super_admin'],
      },
      {
        label: 'Auditoría',
        icon: ShieldCheck,
        url: '/main/audit',
        roles: ['admin', 'super_admin'],
      },
      {
        label: 'Configuración',
        icon: Settings,
        url: '/main/settings',
        roles: ['admin', 'super_admin'],
      },
    ],
  },
];
