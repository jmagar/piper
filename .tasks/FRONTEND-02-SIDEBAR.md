# Sidebar Component Implementation Guide

## Overview

The Sidebar component serves as the primary navigation structure for the application. This implementation resolves current issues with sidebar state management, responsive design, and mobile interaction patterns while leveraging React 19 and TailwindCSS 4 features.

## Component Architecture

```
components-v2/layout/
├── sidebar/
│   ├── sidebar.tsx              # Main sidebar component
│   ├── sidebar-context.tsx      # Sidebar state management
│   ├── sidebar-section.tsx      # Collapsible section component
│   ├── sidebar-item.tsx         # Navigation item component 
│   ├── sidebar-mobile.tsx       # Mobile-specific implementations
│   ├── sidebar-provider.tsx     # Global sidebar state provider
│   └── sidebar-resize-handle.tsx # Draggable resize handle
└── shared/
    └── css-variables.ts         # Shared CSS variable utilities
```

## Key Features

- **Centralized state management** using React Context
- **Responsive design** with mobile-first approach
- **Customizable width** with drag-to-resize functionality
- **Collapse/expand animations** with proper transition management
- **Mobile-optimized interactions** including swipe gestures
- **Accessibility support** with keyboard navigation and ARIA attributes
- **Theme-aware styling** for dark/light mode compatibility

## Implementation

### 1. Sidebar Context

```tsx
// components-v2/layout/sidebar/sidebar-context.tsx
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
  
  // Ensure sidebar is collapsed on mobile
  React.useEffect(() => {
    if (isMobile) {
      setIsCollapsed(true);
    }
  }, [isMobile]);
  
  // Set CSS variables when width or collapsed state changes
  React.useEffect(() => {
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
    
    // Dispatch custom event for other components to react to sidebar changes
    window.dispatchEvent(new CustomEvent("sidebar-update", { 
      detail: { width, isCollapsed }
    }));
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
      localStorage.setItem("sidebar-width", constrainedWidth.toString());
    } catch (error) {
      console.error("Failed to save sidebar width:", error);
    }
  }, []);
  
  // Load saved width from localStorage on initial render
  React.useEffect(() => {
    try {
      const savedWidth = localStorage.getItem("sidebar-width");
      if (savedWidth) {
        const parsedWidth = parseInt(savedWidth, 10);
        if (!isNaN(parsedWidth) && parsedWidth >= MIN_WIDTH && parsedWidth <= MAX_WIDTH) {
          setWidth(parsedWidth);
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
```

### 2. Main Sidebar Component

```tsx
// components-v2/layout/sidebar/sidebar.tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useSidebar } from "./sidebar-context";
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
          "group fixed left-0 top-0 z-20 flex h-dvh flex-col overflow-y-auto",
          "bg-background border-r border-border",
          "transition-width duration-300 ease-in-out",
          isResizing && "transition-none select-none",
          className
        )}
        style={{ 
          width: isCollapsed ? "var(--sidebar-collapsed-width)" : `${width}px` 
        }}
        aria-expanded={!isCollapsed}
      >
        <div className="flex flex-col h-full">
          {children}
        </div>
        
        {/* Resize handle - only visible when not collapsed */}
        {!isCollapsed && (
          <SidebarResizeHandle />
        )}
        
        {/* Collapse/Expand button */}
        <button
          className={cn(
            "absolute right-1 top-4 flex h-6 w-6 items-center justify-center rounded-full",
            "bg-primary/10 text-primary hover:bg-primary/20",
            "transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          )}
          onClick={toggleCollapsed}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={cn(
              "transition-transform duration-200",
              isCollapsed ? "rotate-180" : ""
            )}
          >
            <path
              d="M9.5 13L4.5 8L9.5 3"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </aside>
      
      {/* Main content adjustment */}
      <div 
        className="transition-[margin-left] duration-300 ease-in-out"
        style={{ 
          marginLeft: isCollapsed 
            ? "var(--sidebar-collapsed-width)" 
            : `${width}px` 
        }}
      >
        {/* This is a placeholder div that ensures content respects sidebar width */}
      </div>
    </>
  );
}
```

### 3. Mobile Sidebar Implementation

```tsx
// components-v2/layout/sidebar/sidebar-mobile.tsx
"use client";

import * as React from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components-v2/ui/sheet";
import { Button } from "@/components-v2/ui/button";
import { Menu } from "lucide-react";
import { useSidebar } from "./sidebar-context";
import { cn } from "@/lib/utils";

/**
 * Mobile-optimized sidebar implementation using a sheet/drawer pattern
 */
export function SidebarMobile({ 
  children,
  className,
}: { 
  children: React.ReactNode;
  className?: string;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const { toggleCollapsed } = useSidebar();
  
  // Close sidebar on navigation
  const handleNavigation = React.useCallback(() => {
    setIsOpen(false);
  }, []);
  
  // Use ResizeObserver to handle viewport changes
  React.useEffect(() => {
    const checkOrientation = () => {
      // Close sidebar when changing to landscape on small devices
      if (window.innerWidth > window.innerHeight && window.innerWidth < 640) {
        setIsOpen(false);
      }
    };
    
    const observer = new ResizeObserver(checkOrientation);
    observer.observe(document.documentElement);
    
    return () => {
      observer.disconnect();
    };
  }, []);
  
  // Add navigation event listener to close sidebar on navigation
  React.useEffect(() => {
    window.addEventListener("navigation", handleNavigation);
    return () => {
      window.removeEventListener("navigation", handleNavigation);
    };
  }, [handleNavigation]);
  
  return (
    <>
      {/* Mobile trigger button - fixed in the corner */}
      <Button
        variant="outline"
        size="icon"
        className="fixed left-4 top-4 z-30 md:hidden"
        onClick={() => setIsOpen(true)}
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </Button>
      
      {/* Mobile drawer implementation */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent 
          side="left" 
          className={cn(
            "p-0 w-[85vw] max-w-[300px]",
            className
          )}
        >
          <div className="overflow-y-auto h-dvh">
            {/* Wrap children to handle click events for navigation */}
            <div 
              onClick={handleNavigation}
              className="flex flex-col h-full"
            >
              {children}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
```

### 4. Resize Handle Component

```tsx
// components-v2/layout/sidebar/sidebar-resize-handle.tsx
"use client";

import * as React from "react";
import { useSidebar } from "./sidebar-context";
import { cn } from "@/lib/utils";

/**
 * Draggable resize handle for the sidebar
 */
export function SidebarResizeHandle() {
  const { 
    width, 
    setWidth, 
    startResizing, 
    stopResizing 
  } = useSidebar();
  
  // Handler for resize dragging
  const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    startResizing();
    
    const startX = e.clientX;
    const startWidth = width;
    
    // Handler for mouse movement during resize
    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      const newWidth = startWidth + deltaX;
      setWidth(newWidth);
    };
    
    // Handler for mouse release - cleanup
    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      stopResizing();
    };
    
    // Add temporary listeners for mouse movement and release
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [width, setWidth, startResizing, stopResizing]);
  
  // Touch event handlers for mobile support
  const handleTouchStart = React.useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    startResizing();
    
    const touch = e.touches[0];
    const startX = touch.clientX;
    const startWidth = width;
    
    // Handler for touch movement during resize
    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      const deltaX = touch.clientX - startX;
      const newWidth = startWidth + deltaX;
      setWidth(newWidth);
    };
    
    // Handler for touch end - cleanup
    const handleTouchEnd = () => {
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
      stopResizing();
    };
    
    // Add temporary listeners for touch events
    document.addEventListener("touchmove", handleTouchMove);
    document.addEventListener("touchend", handleTouchEnd);
  }, [width, setWidth, startResizing, stopResizing]);
  
  return (
    <div
      className={cn(
        "absolute right-0 top-0 h-full w-1.5 cursor-ew-resize",
        "bg-transparent transition-colors hover:bg-primary/10",
        "after:absolute after:right-0 after:top-0 after:h-full after:w-1",
        "after:bg-border after:content-['']"
      )}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize sidebar"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") {
          setWidth(width - 10);
        } else if (e.key === "ArrowRight") {
          setWidth(width + 10);
        }
      }}
    />
  );
}
```

### 5. Sidebar Section Component

```tsx
// components-v2/layout/sidebar/sidebar-section.tsx
"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "./sidebar-context";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components-v2/ui/collapsible";

interface SidebarSectionProps {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

/**
 * Collapsible sidebar section with icon and title
 */
export function SidebarSection({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
  className,
}: SidebarSectionProps) {
  const { isCollapsed } = useSidebar();
  const [isOpen, setIsOpen] = React.useState(defaultOpen);
  
  // Reset to open state when sidebar expands from collapsed state
  React.useEffect(() => {
    if (!isCollapsed) {
      setIsOpen(defaultOpen);
    }
  }, [isCollapsed, defaultOpen]);
  
  // If sidebar is collapsed, render a tooltip trigger instead
  if (isCollapsed) {
    return (
      <div className={cn("px-2 py-1", className)}>
        <div className="flex justify-center py-2">
          <div 
            className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent"
            role="button"
            tabIndex={0}
            aria-label={title}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className={cn("px-2 py-1", className)}
    >
      <div className="flex items-center">
        <CollapsibleTrigger asChild>
          <button
            className={cn(
              "flex w-full items-center justify-between rounded-md p-2",
              "text-sm font-medium transition-colors",
              "hover:bg-accent/50 hover:text-accent-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            )}
          >
            <div className="flex items-center gap-2">
              <Icon className="h-5 w-5" />
              <span>{title}</span>
            </div>
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                isOpen && "rotate-180"
              )}
            />
          </button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent>
        <div className="mt-1 ps-2">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}
```

### 6. Sidebar Item Component

```tsx
// components-v2/layout/sidebar/sidebar-item.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "./sidebar-context";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components-v2/ui/tooltip";

interface SidebarItemProps {
  title: string;
  href: string;
  icon: React.ElementType;
  isExternal?: boolean;
  onClick?: () => void; 
  className?: string;
}

/**
 * Navigation item component for the sidebar
 */
export function SidebarItem({
  title,
  href,
  icon: Icon,
  isExternal = false,
  onClick,
  className,
}: SidebarItemProps) {
  const pathname = usePathname();
  const { isCollapsed } = useSidebar();
  
  // Check if the current path matches this nav item
  const isActive = React.useMemo(() => 
    !isExternal && pathname === href, 
    [pathname, href, isExternal]
  );
  
  // Build the component content
  const content = (
    <Link
      href={href}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noopener noreferrer" : undefined}
      className={cn(
        "flex items-center gap-2 rounded-md px-3 py-2 text-sm",
        "transition-colors hover:bg-accent/50 hover:text-accent-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isActive && "bg-accent text-accent-foreground",
        className
      )}
      onClick={onClick}
    >
      <Icon className="h-4 w-4 min-w-4" />
      {!isCollapsed && (
        <>
          <span>{title}</span>
          {isExternal && (
            <ExternalLink className="h-3 w-3 ms-auto" />
          )}
        </>
      )}
    </Link>
  );
  
  // If sidebar is collapsed, wrap in tooltip
  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right">{title}</TooltipContent>
      </Tooltip>
    );
  }
  
  return content;
}
```

## Usage Example

```tsx
// app/layout.tsx
import { SidebarProvider } from "@/components-v2/layout/sidebar/sidebar-context";
import { AppSidebar } from "@/components-v2/layout/app-sidebar";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <SidebarProvider>
          <AppSidebar />
          <main>{children}</main>
        </SidebarProvider>
      </body>
    </html>
  );
}

// components-v2/layout/app-sidebar.tsx
import { Sidebar } from "@/components-v2/layout/sidebar/sidebar";
import { SidebarSection } from "@/components-v2/layout/sidebar/sidebar-section";
import { SidebarItem } from "@/components-v2/layout/sidebar/sidebar-item";
import { MessageSquare, Settings, User } from "lucide-react";

export function AppSidebar() {
  return (
    <Sidebar>
      {/* Logo/Brand section */}
      <div className="p-4 flex justify-center">
        <Logo />
      </div>
      
      {/* Main navigation sections */}
      <SidebarSection title="Messages" icon={MessageSquare}>
        <SidebarItem 
          title="New Chat" 
          href="/v2/chat/new"
          icon={PlusCircle} 
        />
        <SidebarItem 
          title="History" 
          href="/v2/chat/history"
          icon={Clock} 
        />
      </SidebarSection>
      
      {/* User and settings at bottom */}
      <div className="mt-auto">
        <SidebarItem 
          title="Settings" 
          href="/v2/settings"
          icon={Settings} 
        />
        <SidebarItem 
          title="Profile" 
          href="/v2/profile"
          icon={User} 
        />
      </div>
    </Sidebar>
  );
}
```

## CSS Variables

The sidebar components use the following CSS variables that should be added to your globals.css:

```css
:root {
  --sidebar-width: 280px;
  --sidebar-collapsed-width: 64px;
  --sidebar-expanded: 1;
}

/* Media query for mobile */
@media (max-width: 768px) {
  :root {
    --sidebar-expanded: 0;
  }
}
```

## Accessibility Considerations

- All interactive elements have proper keyboard focus management
- ARIA attributes for expanded/collapsed states
- Sufficient color contrast in all theme variations
- Tooltip alternatives for icon-only navigation
- Keyboard shortcuts for common actions (collapsing/expanding)
- Touch targets minimum size of 44×44px for mobile interactions

## Testing Requirements

- Test sidebar rendering in both expanded and collapsed states
- Verify resize functionality works with mouse and touch
- Ensure proper behavior on mobile devices
- Test keyboard navigation through all interactive elements
- Validate correct ARIA attributes for all states
- Verify smooth transitions and animations
- Test across different viewport sizes (small mobile to large desktop)
- Validate theme switching (dark/light mode) works correctly
- Test integration with the main layout and content positioning

## Performance Considerations

- Use React.memo for child components to prevent unnecessary re-renders
- Implement resize throttling for performance during drag operations
- Use CSS transitions instead of JavaScript animations where possible
- Properly clean up event listeners in useEffect hooks
- Use ResizeObserver instead of window resize events for better performance
- Cache computed values with useMemo to prevent recalculations
- Use passive event listeners for touch events
- Implement proper will-change properties for animations 