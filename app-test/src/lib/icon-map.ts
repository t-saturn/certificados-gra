import {
  Boxes,
  CircleHelp,
  Hexagon,
  Layers,
  LayoutDashboard,
  Package,
  UsersRound,
  Settings2,
  UserCircle,
  Ban,
  Shield,
  Activity,
  ShieldCheck,
  UserCog,
  Map,
  ScrollText,
  LucideIcon,
  HelpCircle,
} from 'lucide-react';

// Mapeo de nombres de iconos a componentes
const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  UsersRound,
  CircleQuestionMark: CircleHelp,
  Hexagon,
  Boxes,
  Package,
  Layers,
  Shield,
  Activity,
  ScrollText,
  ShieldCheck,
  UserCog,
  Ban,
  Settings2,
  UserCircle,
  Map,
};

export const getIcon = (iconName?: string | null): LucideIcon => {
  if (!iconName) return HelpCircle;
  return iconMap[iconName] || HelpCircle;
};
