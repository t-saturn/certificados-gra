'use client';

import type { FC, JSX } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import * as LucideIcons from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRole } from '@/components/providers/role-provider';
import { useProfile } from '@/components/providers/profile-provider';
import { keycloakSignOut } from '@/lib/keycloak-logout';
import type { SidebarMenuItem as SidebarMenuItemType } from '@/types/role.types';
import { ChevronRight, LogOut, User, Settings, ChevronsUpDown } from 'lucide-react';

type IconName = keyof typeof LucideIcons;

const DynamicIcon: FC<{ name: string; className?: string }> = ({ name, className }): JSX.Element => {
  const iconName = name as IconName;
  const IconComponent = LucideIcons[iconName] as LucideIcons.LucideIcon | undefined;

  if (!IconComponent) {
    const FallbackIcon = LucideIcons.Circle;
    return <FallbackIcon className={className} />;
  }

  return <IconComponent className={className} />;
};

type NavItemProps = {
  item: SidebarMenuItemType;
  pathname: string;
};

const NavItem: FC<NavItemProps> = ({ item, pathname }): JSX.Element => {
  const isActive = pathname === item.route || pathname.startsWith(item.route + '/');
  const hasChildren = item.children && item.children.length > 0;

  if (hasChildren) {
    return (
      <Collapsible asChild defaultOpen={isActive} className="group/collapsible">
        <SidebarMenuItem>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton tooltip={item.name} isActive={isActive}>
              <DynamicIcon name={item.icon} className="h-4 w-4" />
              <span>{item.name}</span>
              <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub>
              {item.children?.map((child) => {
                const isChildActive = pathname === child.route || pathname.startsWith(child.route + '/');
                return (
                  <SidebarMenuSubItem key={child.id}>
                    <SidebarMenuSubButton asChild isActive={isChildActive}>
                      <Link href={child.route} prefetch={false}>
                        <DynamicIcon name={child.icon} className="h-4 w-4" />
                        <span>{child.name}</span>
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                );
              })}
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>
    );
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild tooltip={item.name} isActive={isActive}>
        <Link href={item.route} prefetch={false}>
          <DynamicIcon name={item.icon} className="h-4 w-4" />
          <span>{item.name}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
};

export const AppSidebar: FC = (): JSX.Element => {
  const pathname = usePathname();
  const { sidebarMenu, roleName } = useRole();
  const { user } = useProfile();

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleLogout = async (): Promise<void> => {
    await keycloakSignOut();
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/main" prefetch={false}>
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Image src="/img/logo.webp" alt="GRA" width={32} height={32} className="size-6" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Certificaciones</span>
                  <span className="truncate text-xs text-muted-foreground">GRA</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegación</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {sidebarMenu.map((item) => (
                <NavItem key={item.id} item={item} pathname={pathname} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={user.image ?? undefined} alt={user.name} />
                    <AvatarFallback className="rounded-lg bg-primary text-primary-foreground text-xs">{getInitials(user.name)}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{user.name}</span>
                    <span className="truncate text-xs text-muted-foreground">{roleName}</span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg" side="bottom" align="end" sideOffset={4}>
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarImage src={user.image ?? undefined} alt={user.name} />
                      <AvatarFallback className="rounded-lg bg-primary text-primary-foreground text-xs">{getInitials(user.name)}</AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">{user.name}</span>
                      <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/main/profile" className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    Mi Perfil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/main/settings" className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    Configuración
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar Sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};
