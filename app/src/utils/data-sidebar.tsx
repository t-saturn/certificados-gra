import { SidebarMenuGroup } from '@/types/sidebar-types';
import { LayoutDashboard, Users, FileSpreadsheet, ShieldCheck, Settings, Settings2, UserCircle, Signature, Calendar, ChartSpline } from 'lucide-react';

export const baseMenus: SidebarMenuGroup[] = [
  {
    title: 'Menú',
    menu: [
      {
        label: 'Panel Principal',
        icon: LayoutDashboard,
        url: '/main/dashboard',
        roles: ['user', 'admin', 'super_admin'],
      },
      {
        label: 'Eventos',
        icon: Calendar,
        url: '/main/events',
        roles: ['admin', 'super_admin'],
      },
      {
        label: 'Participantes',
        icon: Users,
        url: '/main/participants',
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

  {
    title: 'Configuración',
    menu: [
      {
        label: 'Ajustes',
        icon: Settings2,
        url: '/main/settings',
        roles: ['user', 'admin', 'super_admin'],
      },
      {
        label: 'Cuenta',
        icon: UserCircle,
        url: '/main/account',
        roles: ['user', 'admin', 'super_admin'],
      },
    ],
  },
];
