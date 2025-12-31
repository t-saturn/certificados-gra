import { LayoutDashboard, Users, UserCog, Shield, ShieldCheck, Settings, FileText, FolderOpen, Home, Package, Boxes, Layers, Activity, Ban, Hexagon, Circle, ClipboardList, type LucideIcon } from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  Dashboard: LayoutDashboard,
  Users,
  UsersRound: Users,
  UserCog,
  Shield,
  ShieldCheck,
  Settings,
  FileText,
  FolderOpen,
  Home,
  Package,
  Boxes,
  Layers,
  Activity,
  Ban,
  Hexagon,
  Circle,
  ClipboardList,
  CircleQuestionMark: Circle,
};

export const getIcon = (iconName: string | null | undefined): LucideIcon => {
  if (!iconName) return Circle;
  return iconMap[iconName] ?? Circle;
};
