"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface NavigationItem {
  href: string;
  label: string;
}

interface HeaderNavigationProps {
  /**
   * Optional additional className for the component
   */
  className?: string;
}

/**
 * Horizontal navigation links for the header
 * 
 * This component displays the main navigation links in the header
 * and highlights the active link based on the current path.
 * 
 * @example
 * ```tsx
 * <HeaderNavigation className="ml-4" />
 * ```
 */
export function HeaderNavigation({ className }: HeaderNavigationProps) {
  const pathname = usePathname();
  
  // Navigation items - these would typically be dynamic or from a config
  const navItems = React.useMemo<NavigationItem[]>(() => [
    { href: '/chat', label: 'Chat' }
  ], []);
  
  return (
    <nav className={cn("hidden md:flex items-center space-x-1", className)}>
      {navItems.map((item) => {
        const isActive = pathname.startsWith(item.href);
        
        return (
          <Button
            key={item.href}
            variant={isActive ? "default" : "ghost"}
            size="sm"
            asChild
          >
            <Link href={item.href}>{item.label}</Link>
          </Button>
        );
      })}
    </nav>
  );
} 