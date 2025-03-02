"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ThemeProviderProps } from "next-themes";

/**
 * Theme provider component for handling dark/light mode
 * Wraps next-themes provider with client-side rendering
 * 
 * @param props - Theme provider props from next-themes
 * @param props.children - Child components to render within the theme context
 * @returns Theme provider component with children
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
} 