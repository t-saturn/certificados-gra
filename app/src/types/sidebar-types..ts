import { LucideIcon } from 'lucide-react';

export interface SidebarSubItem {
  label: string;
  icon: LucideIcon;
  url: string;
}

export interface SidebarMenuItem {
  label: string;
  icon?: LucideIcon;
  url: string;
  items?: SidebarMenuItem[];
}

export interface SidebarMenuGroup {
  title: string;
  menu: SidebarMenuItem[];
}
