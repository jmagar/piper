"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "./sidebar-context";

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
    <div className={cn("px-2 py-1", className)}>
      <div className="flex items-center">
        <button
          className={cn(
            "flex w-full items-center justify-between rounded-md p-2",
            "text-sm font-medium transition-colors",
            "hover:bg-accent/50 hover:text-accent-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          )}
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
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
      </div>
      
      {/* Content - only show if open */}
      {isOpen && (
        <div className="mt-1 ps-2">
          {children}
        </div>
      )}
    </div>
  );
} 