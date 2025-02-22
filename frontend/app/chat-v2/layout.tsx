"use client"

import type { ReactNode, CSSProperties } from 'react';

import { AppSidebar } from "@/components/app-sidebar"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

export default function ChatLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "350px",
      } as CSSProperties}
    >
      <div className="flex h-screen">
        <AppSidebar />
        <SidebarInset>
          <main className="flex-1 flex flex-col overflow-hidden">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
} 