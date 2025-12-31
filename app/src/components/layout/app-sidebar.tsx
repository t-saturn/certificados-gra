'use client';

import type { FC, JSX } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, useSidebar } from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRole } from '@/components/providers/role-provider';
import { useProfile } from '@/components/providers/profile-provider';
import { keycloakSignOut } from '@/lib/keycloak-logout';
import type { SidebarMenuItem as SidebarMenuItemType } from '@/types/role.types';
import { LogOut, User, Settings, ChevronsUpDown, ChevronDown } from 'lucide-react';

export const AppSidebar: FC = (): JSX.Element => {
  const pathname = usePathname();
  const { sidebarMenu, roleName } = useRole();
  const { user } = useProfile();
  const { state, isMobile, setOpenMobile } = useSidebar();
  const isCollapsed = state === 'collapsed';

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

  const handleLinkClick = (): void => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const isItemActive = (item: SidebarMenuItemType): boolean => {
    if (pathname === item.url) return true;
    if (item.items?.some((subitem) => pathname === subitem.url || pathname.startsWith(subitem.url + '/'))) {
      return true;
    }
    return false;
  };

  const isSubItemActive = (url: string): boolean => {
    return pathname === url || pathname.startsWith(url + '/');
  };

  return (
    <Sidebar className="border-r border-border" collapsible="icon">
      <SidebarHeader className="border-b border-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/main" prefetch={false} onClick={handleLinkClick}>
                <div className="flex aspect-square size-8 items-center justify-center">
                  <Image src="/img/logo.webp" alt="GRA" width={32} height={32} className="size-8" />
                </div>
                {!isCollapsed && (
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-bold text-lg">Certificaciones</span>
                    <span className="truncate text-xs text-muted-foreground">GRA</span>
                  </div>
                )}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {sidebarMenu.map((group, groupIndex) => (
          <SidebarGroup key={groupIndex}>
            {!isCollapsed && <SidebarGroupLabel className="px-4 text-xs font-semibold uppercase text-muted-foreground">{group.title}</SidebarGroupLabel>}
            <SidebarMenu>
              {group.menu.map((item, itemIndex) => {
                const active = isItemActive(item);
                const hasSubItems = item.items && item.items.length > 0;
                const Icon = item.icon;

                if (hasSubItems) {
                  return (
                    <Collapsible key={itemIndex} asChild defaultOpen={active} className="group/collapsible">
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton tooltip={isCollapsed ? item.label : undefined} className={`hover:bg-primary hover:text-primary-foreground ${active ? 'bg-primary text-primary-foreground' : ''}`}>
                            <Icon className="size-4" />
                            {!isCollapsed && <span>{item.label}</span>}
                            {!isCollapsed && <ChevronDown className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />}
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {item.items?.map((subitem, subIndex) => {
                              const subActive = isSubItemActive(subitem.url);
                              const SubIcon = subitem.icon;
                              return (
                                <Link
                                  key={subIndex}
                                  href={subitem.url}
                                  prefetch={false}
                                  onClick={handleLinkClick}
                                  className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
                                    subActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-primary hover:text-primary-foreground'
                                  }`}
                                >
                                  <SubIcon className="size-4" />
                                  <span>{subitem.label}</span>
                                </Link>
                              );
                            })}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  );
                }

                return (
                  <SidebarMenuItem key={itemIndex}>
                    <SidebarMenuButton asChild tooltip={isCollapsed ? item.label : undefined} className={`hover:bg-primary hover:text-primary-foreground ${active ? 'bg-primary text-primary-foreground' : ''}`}>
                      <Link href={item.url} prefetch={false} onClick={handleLinkClick}>
                        <Icon className="size-4" />
                        {!isCollapsed && <span>{item.label}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={user.image ?? undefined} alt={user.name} />
                    <AvatarFallback className="rounded-lg bg-primary text-primary-foreground text-xs">{getInitials(user.name)}</AvatarFallback>
                  </Avatar>
                  {!isCollapsed && (
                    <>
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-semibold">{user.name}</span>
                        <span className="truncate text-xs text-muted-foreground">{roleName}</span>
                      </div>
                      <ChevronsUpDown className="ml-auto size-4" />
                    </>
                  )}
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
