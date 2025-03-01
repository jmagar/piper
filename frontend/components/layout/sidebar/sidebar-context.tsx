"use client";

import * as React from "react";
import { useMediaQuery } from "@/hooks/use-media-query";

// Define CSS variable names as constants to ensure consistency
const CSS_VAR_SIDEBAR_WIDTH = "--sidebar-width";
const CSS_VAR_SIDEBAR_COLLAPSED_WIDTH = "--sidebar-collapsed-width";
const CSS_VAR_SIDEBAR_EXPANDED = "--sidebar-expanded";

// Configuration constants
const DEFAULT_WIDTH = 280; // Default sidebar width in pixels
const COLLAPSED_WIDTH = 64; // Width when sidebar is collapsed
const MIN_WIDTH = 220; // Minimum width when resizing
const MAX_WIDTH = 480; // Maximum width when resizing
const MOBILE_BREAKPOINT = "768px"; // Mobile breakpoint (matches tailwind md)

interface SidebarContextProps {
  // State
  width: number;
  isCollapsed: boolean;
  isResizing: boolean;
  isMobile: boolean;
  
  // Actions
  setWidth: (width: number) => void;
  toggleCollapsed: () => void;
  startResizing: () => void;
  stopResizing: () => void;
}

const SidebarContext = React.createContext<SidebarContextProps | undefined>(undefined);

/**
 * Provider component for sidebar state management
 */
export function SidebarProvider({ children }: { children: React.ReactNode }) {
  // Determine if on mobile based on media query
  const isMobile = !useMediaQuery(`(min-width: ${MOBILE_BREAKPOINT})`);
  
  // State for sidebar configuration
  const [width, setWidth] = React.useState<number>(DEFAULT_WIDTH);
  const [isCollapsed, setIsCollapsed] = React.useState<boolean>(false);
  const [isResizing, setIsResizing] = React.useState<boolean>(false);
  
  // Ensure sidebar is collapsed on mobile, expanded on desktop
  React.useEffect(() => {
    if (isMobile) {
      setIsCollapsed(true);
    } else {
      setIsCollapsed(false); // Always expanded on desktop
    }
  }, [isMobile]);
  
  // Set CSS variables when width or collapsed state changes
  React.useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.style.setProperty(
        CSS_VAR_SIDEBAR_WIDTH, 
        `${width}px`
      );
      document.documentElement.style.setProperty(
        CSS_VAR_SIDEBAR_COLLAPSED_WIDTH, 
        `${COLLAPSED_WIDTH}px`
      );
      document.documentElement.style.setProperty(
        CSS_VAR_SIDEBAR_EXPANDED, 
        isCollapsed ? "0" : "1"
      );
    }
  }, [width, isCollapsed]);
  
  // Action to toggle collapsed state
  const toggleCollapsed = React.useCallback(() => {
    setIsCollapsed(prev => !prev);
  }, []);
  
  // Actions for resize handling
  const startResizing = React.useCallback(() => {
    setIsResizing(true);
  }, []);
  
  const stopResizing = React.useCallback(() => {
    setIsResizing(false);
  }, []);
  
  // Handler for setting width with constraints
  const handleSetWidth = React.useCallback((newWidth: number) => {
    const constrainedWidth = Math.min(Math.max(newWidth, MIN_WIDTH), MAX_WIDTH);
    setWidth(constrainedWidth);
    
    // Store in localStorage for persistence
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("sidebar-width", constrainedWidth.toString());
      }
    } catch (error) {
      console.error("Failed to save sidebar width:", error);
    }
  }, []);
  
  // Load saved width from localStorage on initial render
  React.useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const savedWidth = window.localStorage.getItem("sidebar-width");
        if (savedWidth) {
          const parsedWidth = parseInt(savedWidth, 10);
          if (!isNaN(parsedWidth) && parsedWidth >= MIN_WIDTH && parsedWidth <= MAX_WIDTH) {
            setWidth(parsedWidth);
          }
        }
      }
    } catch (error) {
      console.error("Failed to load sidebar width:", error);
    }
  }, []);
  
  // Context value
  const contextValue: SidebarContextProps = {
    width,
    isCollapsed,
    isResizing,
    isMobile,
    setWidth: handleSetWidth,
    toggleCollapsed,
    startResizing,
    stopResizing,
  };
  
  return (
    <SidebarContext.Provider value={contextValue}>
      {children}
    </SidebarContext.Provider>
  );
}

/**
 * Hook for consuming sidebar context
 */
export function useSidebar() {
  const context = React.useContext(SidebarContext);
  
  if (context === undefined) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  
  return context;
}

/**
 * Export constants for reuse
 */
export {
  DEFAULT_WIDTH,
  COLLAPSED_WIDTH,
  MIN_WIDTH,
  MAX_WIDTH,
  CSS_VAR_SIDEBAR_WIDTH,
  CSS_VAR_SIDEBAR_COLLAPSED_WIDTH,
  CSS_VAR_SIDEBAR_EXPANDED,
}; 