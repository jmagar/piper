"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useSidebar } from "./sidebar-context";
// We will create these files next
import { SidebarResizeHandle } from "./sidebar-resize-handle";
import { SidebarMobile } from "./sidebar-mobile";

/**
 * Main sidebar component that adapts to desktop and mobile
 */
export function Sidebar({ 
  children,
  className,
}: { 
  children: React.ReactNode;
  className?: string;
}) {
  const { 
    width, 
    isCollapsed, 
    isMobile, 
    isResizing,
    toggleCollapsed,
  } = useSidebar();
  
  // Render different versions for mobile and desktop
  if (isMobile) {
    return <SidebarMobile>{children}</SidebarMobile>;
  }
  
  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 flex h-full flex-col overflow-y-auto",
          "bg-background border-r border-border",
          "transition-width duration-300 ease-in-out",
          isResizing && "transition-none select-none",
          className
        )}
        style={{ 
          width: isCollapsed ? "var(--sidebar-collapsed-width)" : `${width}px`,
          minWidth: isCollapsed ? "var(--sidebar-collapsed-width)" : "200px" 
        }}
        aria-expanded={!isCollapsed}
      >
        <div className="flex flex-col h-full">
          {children}
        </div>
        
        {/* Resize handle */}
        <SidebarResizeHandle />
      </aside>
      
      {/* Overlay for mobile sidebar */}
      {!isCollapsed && isMobile && (
        <div 
          className="fixed inset-0 z-30 bg-black/50" 
          onClick={toggleCollapsed}
        />
      )}
    </>
  );
} 