"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Search, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import Link from "next/link";
import { useHeaderContext } from "./header-context";
import { HeaderSearch } from "./header-search";
import { HeaderNavigation } from "./header-navigation";
import { HeaderActions } from "./header-actions";
import { ThemeSwitcher } from "@/components/shared/theme-switcher";
import { User, Bell, Settings } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { SocketStatusIcon } from "@/components/ui/socket-status-icon";

interface HeaderProps {
  /**
   * Optional title to display in the header
   */
  title?: string;
  
  /**
   * Optional additional className for the header
   */
  className?: string;
}

/**
 * The main application header component
 * 
 * This component adapts to both desktop and mobile views with a responsive design
 * and integrates with the sidebar component.
 * 
 * @example
 * ```tsx
 * <Header title="Dashboard" />
 * ```
 */
export function Header({ title = "Pooper App", className }: HeaderProps) {
  const { isSidebarExpanded, isMobile } = useHeaderContext();
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  
  // Calculate the header styles based on the sidebar state
  const headerStyles = React.useMemo(() => {
    return {
      paddingLeft: isSidebarExpanded && !isMobile ? "var(--sidebar-width)" : "var(--sidebar-collapsed-width)",
    };
  }, [isSidebarExpanded, isMobile]);
  
  // Desktop header view
  if (!isMobile) {
    return (
      <header 
        className={cn(
          "fixed top-0 right-0 h-[var(--header-height)] z-35 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
          className
        )}
        style={headerStyles}
      >
        <div className="flex h-full items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <div className="hidden lg:block">
              <Logo />
            </div>
            {title && (
              <h1 className="text-lg font-semibold">{title}</h1>
            )}
            <HeaderNavigation className="ml-4" />
          </div>
          
          {/* Centered search */}
          <div className="flex flex-1 justify-center mx-4">
            <HeaderSearch className="w-full max-w-md" />
          </div>
          
          <div className="flex items-center gap-2">
            <SocketStatusIcon className="mr-2" />
            <HeaderActions />
          </div>
        </div>
      </header>
    );
  }
  
  // Mobile header view
  return (
    <header 
      className={cn(
        "fixed top-0 left-0 right-0 h-[var(--header-height)] z-35 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        className
      )}
    >
      <div className="flex items-center justify-between h-full px-4">
        <div className="flex items-center gap-3">
          <Logo />
          <h1 className="text-lg font-semibold truncate max-w-[180px]">{title}</h1>
        </div>
        
        {/* Centered search trigger */}
        <div className="flex-1 flex justify-center">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Search"
            onClick={() => setIsSearchOpen(true)}
          >
            <Search className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="flex items-center">
          <SocketStatusIcon className="mr-2" />
          {/* Menu trigger */}
          <Button
            variant="ghost"
            size="icon"
            aria-label="Menu"
            onClick={() => setIsMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Mobile search panel */}
        <Sheet open={isSearchOpen} onOpenChange={setIsSearchOpen}>
          <SheetContent side="top" className="pt-16">
            <HeaderSearch
              className="w-full"
              onSearch={() => setIsSearchOpen(false)}
            />
          </SheetContent>
        </Sheet>
        
        {/* Mobile menu panel */}
        <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <SheetContent side="right" className="p-0">
            <div className="flex flex-col h-full">
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold">Menu</h2>
              </div>
              
              <nav className="flex flex-col p-4 gap-2">
                {[
                  { href: "/profile", icon: User, label: "Profile" },
                  { href: "/notifications", icon: Bell, label: "Notifications" },
                  { href: "/settings", icon: Settings, label: "Settings" },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </Link>
                ))}
              </nav>
              
              <div className="mt-auto p-4 border-t">
                <div className="flex items-center justify-between">
                  <span>Theme</span>
                  <ThemeSwitcher />
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
} 