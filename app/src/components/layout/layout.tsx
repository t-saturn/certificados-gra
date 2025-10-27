'use client';

import React from 'react';

import AppSidebar from './sidebar';

import { SidebarInset } from '@/components/ui/sidebar';
import Navbar from '../navbar/navbar';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [hoveredItem, setHoveredItem] = React.useState<string | null>(null);

  return (
    <div className="flex gap-2 bg-background p-2 w-full h-screen">
      <AppSidebar hoveredItem={hoveredItem} setHoveredItem={setHoveredItem} />
      <SidebarInset className="flex-1 bg-card shadow-sm border border-border rounded-lg overflow-y-auto">
        <Navbar />
        <div className="p-4">{children}</div>
      </SidebarInset>
    </div>
  );
}
