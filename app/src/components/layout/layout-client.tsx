'use client';

import type { FC, ReactNode, JSX } from 'react';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from './app-sidebar';
import { LayoutHeader } from './layout-header';
import { Toaster } from '@/components/ui/sonner';

type LayoutClientProps = {
  children: ReactNode;
};

export const LayoutClient: FC<LayoutClientProps> = ({ children }): JSX.Element => {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <LayoutHeader />
        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </SidebarInset>
      <Toaster position="top-right" richColors closeButton />
    </SidebarProvider>
  );
};
