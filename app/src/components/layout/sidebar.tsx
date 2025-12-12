'use client';

import { ChevronDown } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useRef } from 'react';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarHeader } from '@/components/ui/sidebar';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, useSidebar } from '@/components/ui/sidebar';
import { fn_get_sidebar_menu } from '@/helpers/sidebar-helper';
import { SidebarItem, SidebarSubItem } from '@/types/sidebar-types';
import { useProfile } from '@/context/profile';

export default function AppSidebar({ hoveredItem, setHoveredItem }: { hoveredItem: string | null; setHoveredItem: (item: string | null) => void }) {
  const { profile } = useProfile();
  const { state, isMobile, setOpenMobile } = useSidebar();
  const isCollapsed = state === 'collapsed';
  const pathname = usePathname();
  const [hoverPosition, setHoverPosition] = useState<number>(0);
  const menuRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const sidebarMenus = fn_get_sidebar_menu(profile.role);

  const handleMouseEnter = (item: string, event: React.MouseEvent) => {
    if (isCollapsed && sidebarMenus.some((group) => group.menu.some((menuItem: SidebarItem) => menuItem.label === item && menuItem.items))) {
      setHoveredItem(item);
      const target = event.currentTarget as HTMLDivElement;
      const rect = target.getBoundingClientRect();
      setHoverPosition(rect.top);
    }
  };

  const handleMouseLeave = () => setHoveredItem(null);

  return (
    <>
      <Sidebar className="relative shadow-sm border border-border rounded-lg h-full overflow-hidden" collapsible="icon">
        <SidebarHeader className="flex items-center bg-card border-b rounded-t-lg">
          {!isCollapsed ? (
            <div className="flex items-center gap-4 p-6 font-semibold">
              <Image src="/img/logo.webp" alt="logo" width={40} height={20} />
              <div className="flex flex-col">
                <span className="font-bold text-xl">Certificaciones</span>
                <span className="font-light text-muted-foreground text-sm">Sistema de Certificaciones</span>
              </div>
            </div>
          ) : (
            <div className="p-2">
              <Image src="/img/logo.webp" alt="logo" width={20} height={20} />
            </div>
          )}
        </SidebarHeader>
        <SidebarContent className="bg-card rounded-b-lg">
          {sidebarMenus.map((menubar, index) => (
            <SidebarGroup key={index}>
              {!isCollapsed && <SidebarGroupLabel className="px-6 font-semibold text-muted-foreground text-xs uppercase">{menubar.title}</SidebarGroupLabel>}
              <SidebarMenu>
                {menubar.menu.map((item: SidebarItem, i: number) => {
                  const isActive = item.url === pathname || (item.items && item.items.some((subitem: SidebarSubItem) => subitem.url === pathname));

                  const isSubItemActive = item.items && item.items.some((subitem: SidebarSubItem) => subitem.url === pathname);

                  return (
                    <SidebarMenuItem key={i}>
                      {item.items ? (
                        <Collapsible asChild className="group/collapsible hover:cursor-pointer">
                          <div
                            ref={(el) => {
                              if (el) menuRefs.current.set(item.label, el);
                            }}
                          >
                            <CollapsibleTrigger asChild>
                              <SidebarMenuButton
                                tooltip={item.items ? undefined : item.label}
                                className={`hover:bg-primary hover:text-[#eff1f5] ${
                                  isActive
                                    ? isSubItemActive && !isCollapsed
                                      ? 'bg-secondary group-data-[state=closed]/collapsible:bg-primary'
                                      : 'bg-primary text-[#eff1f5]'
                                    : 'data-[active=true]:bg-primary data-[active=true]:text-[#eff1f5]'
                                } hover:cursor-pointer`}
                                onMouseEnter={(e) => handleMouseEnter(item.label, e)}
                                onMouseLeave={handleMouseLeave}
                              >
                                {item.icon && <item.icon width={16} />}
                                {!isCollapsed && <span>{item.label}</span>}
                                <ChevronDown className="ml-auto group-data-[state=open]/collapsible:rotate-180 transition-transform duration-200" />
                              </SidebarMenuButton>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <SidebarMenuSub>
                                {item.items.map((subitem: SidebarSubItem, j: number) => {
                                  const isSubItemActive = subitem.url === pathname;
                                  return (
                                    <Link
                                      href={subitem.url}
                                      key={j}
                                      className={`px-2 py-1 text-xs flex items-center gap-2 rounded-lg ${
                                        isSubItemActive ? 'bg-primary text-[#eff1f5]' : 'hover:bg-primary hover:text-[#eff1f5]'
                                      }`}
                                      onClick={() => {
                                        if (isMobile) {
                                          setOpenMobile(false);
                                        }
                                      }}
                                    >
                                      {subitem.icon && <subitem.icon width={16} />}
                                      <span>{subitem.label}</span>
                                    </Link>
                                  );
                                })}
                              </SidebarMenuSub>
                            </CollapsibleContent>
                          </div>
                        </Collapsible>
                      ) : (
                        <Link href={item.url}>
                          <SidebarMenuButton
                            className={`hover:bg-primary hover:text-[#eff1f5] ${
                              isActive ? 'bg-primary text-[#eff1f5]' : 'data-[active=true]:bg-primary data-[active=true]:text-[#eff1f5]'
                            } hover:cursor-pointer`}
                            onMouseEnter={(e) => handleMouseEnter(item.label, e)}
                            onMouseLeave={handleMouseLeave}
                            onClick={() => {
                              if (isMobile) {
                                setOpenMobile(false);
                              }
                            }}
                            tooltip={item.items ? undefined : item.label}
                          >
                            {item.icon && <item.icon width={16} />}
                            {!isCollapsed && <span>{item.label}</span>}
                          </SidebarMenuButton>
                        </Link>
                      )}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroup>
          ))}
        </SidebarContent>
      </Sidebar>

      {hoveredItem && isCollapsed && sidebarMenus.some((group) => group.menu.some((item: SidebarItem) => item.label === hoveredItem && item.items)) && (
        <div
          className="left-11 z-50 absolute bg-card shadow-lg py-1 border rounded-md w-48"
          style={{ top: `${hoverPosition}px` }}
          onMouseEnter={() => {
            const item = sidebarMenus.flatMap((group) => group.menu).find((i) => i.label === hoveredItem);
            if (item?.items) setHoveredItem(hoveredItem);
          }}
          onMouseLeave={() => setHoveredItem(null)}
        >
          <div className="px-3 py-2 font-medium text-muted-foreground text-sm">{hoveredItem}</div>
          <div className="border-t"></div>
          {sidebarMenus
            .flatMap((group) => group.menu)
            .find((item) => item.label === hoveredItem)
            ?.items?.map((subitem: SidebarSubItem, index: number) => {
              const isSubItemActive = subitem.url === pathname;
              return (
                <Link
                  href={subitem.url}
                  key={index}
                  className={`flex items-center gap-2 m-2 px-3 py-2 text-sm rounded-lg ${isSubItemActive ? 'bg-primary text-white' : 'hover:bg-primary hover:text-white'}`}
                >
                  {subitem.icon && <subitem.icon className="w-4 h-4" />}
                  <span>{subitem.label}</span>
                </Link>
              );
            })}
        </div>
      )}
    </>
  );
}
