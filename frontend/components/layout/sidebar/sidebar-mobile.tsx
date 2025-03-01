"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Menu } from "lucide-react";

interface SidebarMobileProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Mobile-optimized sidebar implementation using a sheet/drawer pattern
 */
export function SidebarMobile({ 
  children,
  className,
}: SidebarMobileProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  
  // Handle viewport orientation changes using window resize
  React.useEffect(() => {
    // Skip effect on server
    if (typeof window === 'undefined') return;
    
    const checkOrientation = () => {
      // Close sidebar when changing to landscape on small devices
      if (window.innerWidth > window.innerHeight && window.innerWidth < 640) {
        setIsOpen(false);
      }
    };

    // Listen for window resize events
    window.addEventListener("resize", checkOrientation);
    return () => {
      window.removeEventListener("resize", checkOrientation);
    };
  }, []);
  
  // Add navigation event listener to close sidebar on navigation
  React.useEffect(() => {
    // Skip effect on server
    if (typeof window === 'undefined') return;
    
    const handleClick = () => {
      setIsOpen(false);
    };
    
    window.addEventListener("popstate", handleClick);
    return () => {
      window.removeEventListener("popstate", handleClick);
    };
  }, []);
  
  // Handle click outside to close
  React.useEffect(() => {
    // Skip effect on server or if drawer is closed
    if (typeof window === 'undefined' || !isOpen) return;
    
    const handleClickOutside = () => {
      setIsOpen(false);
    };
    
    window.addEventListener("click", handleClickOutside);
    return () => {
      window.removeEventListener("click", handleClickOutside);
    };
  }, [isOpen]);
  
  return (
    <>
      {/* Mobile trigger button - fixed in the corner */}
      <button
        className="fixed left-4 top-4 z-30 flex h-10 w-10 items-center justify-center rounded-md border border-border bg-background md:hidden"
        onClick={() => setIsOpen(true)}
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>
      
      {/* Mobile drawer implementation */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40 bg-black/50 md:hidden" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Sidebar */}
          <aside
            className={cn(
              "fixed inset-y-0 left-0 z-50 flex h-screen w-[85vw] max-w-[300px] flex-col",
              "bg-background border-r border-border",
              "transform transition-transform duration-300 ease-in-out",
              className
            )}
          >
            <div 
              className="flex h-full flex-col overflow-y-auto p-4" 
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent/50"
                onClick={() => setIsOpen(false)}
                aria-label="Close sidebar"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 4L4 12M4 4L12 12"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              
              {/* Content */}
              <div className="mt-8">{children}</div>
            </div>
          </aside>
        </>
      )}
    </>
  );
} 