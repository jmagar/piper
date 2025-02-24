"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider } from "@/components/ui/sidebar-new"

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden">
        <div className="flex-shrink-0">
          <AppSidebar />
        </div>
        <main className="flex-1 flex flex-col overflow-hidden bg-background">
          {children}
        </main>
      </div>
    </SidebarProvider>
  )
} 