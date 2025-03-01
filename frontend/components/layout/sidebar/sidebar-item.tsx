"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "./sidebar-context";

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
      onClick={onClick as React.MouseEventHandler<HTMLAnchorElement>}
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
  
  // If sidebar is collapsed, add tooltip or similar accessibility enhancement
  if (isCollapsed) {
    return (
      <div className="relative group">
        {content}
        <div className="absolute left-full top-0 ml-2 rounded-md bg-popover px-2 py-1 text-sm opacity-0 shadow-md transition-opacity group-hover:opacity-100">
          {title}
        </div>
      </div>
    );
  }
  
  return content;
} 