'use client';

import * as React from 'react';
import { ThemeProvider as NextThemeProvider } from 'next-themes';

/**
 * Provider component for theme management
 * @param children - React children nodes
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemeProvider>
  );
} 