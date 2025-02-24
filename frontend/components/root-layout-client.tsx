"use client"

import { ThemeProvider } from "@/components/theme-provider"
import { SidebarProvider } from "@/components/ui/sidebar-new"
import { AppSidebar } from "@/components/app-sidebar"

interface RootLayoutClientProps {
  children: React.ReactNode
}

export function RootLayoutClient({ children }: RootLayoutClientProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <div className="min-h-screen bg-background font-sans antialiased">
        <div className="flex min-h-screen">
          <SidebarProvider>
            <AppSidebar />
          </SidebarProvider>
          <main className="flex-1 ml-72">
            {children}
          </main>
        </div>
      </div>
    </ThemeProvider>
  )
} 