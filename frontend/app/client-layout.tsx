"use client";

import * as React from 'react';
import { ThemeProvider } from "@/components/shared/theme-provider";
import { Toaster } from "sonner";
import { EnvProvider } from "./env-provider";
import { SocketProvider } from "@/lib/socket-provider";
import { AppErrorBoundary } from "@/components/shared/error-boundary";

/**
 * Client-side layout component that provides context providers
 * This component handles all client-side functionality
 * 
 * @param props - Component props
 * @param props.children - Child components to render
 * @returns Client layout with providers and children
 */
export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppErrorBoundary>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <EnvProvider />
        <SocketProvider>
          {children}
          <Toaster 
            position="bottom-right" 
            toastOptions={{
              className: "max-w-[90vw] sm:max-w-md",
            }}
          />
        </SocketProvider>
      </ThemeProvider>
    </AppErrorBoundary>
  );
} 