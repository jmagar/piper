"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface LogoProps {
  /**
   * Optional additional className for the component
   */
  className?: string;
}

/**
 * Application logo component
 * 
 * This component displays the application logo with optional styling.
 * It links to the home page by default.
 * 
 * @example
 * ```tsx
 * <Logo className="h-8 w-8" />
 * ```
 */
export function Logo({ className }: LogoProps) {
  return (
    <Link href="/" className="flex items-center gap-2">
      <div 
        className={cn(
          "flex items-center justify-center h-8 w-8 rounded-md bg-primary text-primary-foreground font-bold text-lg",
          className
        )}
      >
        P
      </div>
    </Link>
  );
} 