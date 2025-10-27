import { LucideIcon } from 'lucide-react';

export interface SidebarSubItem {
  label: string;
  icon: LucideIcon;
  url: string;
}

// Interfaz para los ítems principales (puede tener submenús)
export interface SidebarItem {
  label: string;
  icon: LucideIcon;
  url: string;
  items?: SidebarSubItem[];
  roles?: string[];
}

// Interfaz para los grupos de menú
export interface SidebarMenuGroup {
  title: string;
  menu: SidebarItem[];
}
