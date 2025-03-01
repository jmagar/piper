"use client";

import * as React from "react";
import { SidebarProvider } from "@/components/layout/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { HeaderProvider } from "@/components/layout/header/header-context";
import { Header } from "@/components/layout/header/header";
import { TooltipProvider } from "@/components/ui/tooltip";

interface AppLayoutProps {
  /**
   * Child components to render within the layout
   */
  children: React.ReactNode;
  
  /**
   * Optional title to display in the header
   */
  title?: string;
}

/**
 * Main application layout component
 * Provides the sidebar and header contexts and renders the app structure
 * 
 * @example
 * ```tsx
 * <AppLayout title="Dashboard">
 *   <DashboardContent />
 * </AppLayout>
 * ```
 */
export function AppLayout({ children, title }: AppLayoutProps) {
  // Create props object for Header with correct types
  const headerProps = title ? { title } : {};
  
  return (
    <SidebarProvider>
      <HeaderProvider>
        <TooltipProvider>
          <div className="relative flex h-screen w-full overflow-hidden bg-background">
            {/* Sidebar */}
            <AppSidebar />
            
            {/* Main content container */}
            <div className="flex flex-col flex-1 with-sidebar-margin transition-all duration-300">
              {/* Header */}
              <Header {...headerProps} />
              
              {/* Main content area */}
              <main className="flex-1 overflow-auto pt-16 relative">
                <div className="h-full w-full p-4 md:p-6">
                  {children}
                </div>
              </main>
            </div>
          </div>
        </TooltipProvider>
      </HeaderProvider>
    </SidebarProvider>
  );
}

/**
 * Usage example in a layout file:
 * 
 * ```tsx
 * // app/layout.tsx
 * import { AppLayout } from "@/components/layout/app-layout";
 * 
 * export default function Layout({ children }) {
 *   return <AppLayout>{children}</AppLayout>;
 * }
 * ```
 */ 