import { type LucideIcon, LayoutDashboard, Settings, Circle, FileSpreadsheet, Signature, ChartSpline, Calendar, ShieldCheck } from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  ChartSpline,
  Calendar,
  FileSpreadsheet,
  Signature,
  ShieldCheck,
  Settings,
};

export const getIcon = (iconName: string | null | undefined): LucideIcon => {
  if (!iconName) return Circle;
  return iconMap[iconName] ?? Circle;
};
