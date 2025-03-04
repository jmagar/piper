"use client";

import * as React from 'react';
import { ThemeProvider } from "@/components/shared/theme-provider";
import { Toaster } from "sonner";
import { EnvProvider } from "./env-provider";
import { SocketProvider } from "@/lib/socket/providers/socket-provider";
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
  // Default user ID for socket authentication
  const [userId, setUserId] = React.useState<string>("user-1");

  // Get user ID from localStorage if available (client-side only)
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUserId = localStorage.getItem('userId');
      if (storedUserId) {
        setUserId(storedUserId);
      } else {
        // Generate a random user ID if none exists
        const newUserId = `user-${Math.floor(Math.random() * 10000)}`;
        localStorage.setItem('userId', newUserId);
        setUserId(newUserId);
      }
    }
  }, []);

  return (
    <AppErrorBoundary>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <EnvProvider />
        <SocketProvider 
          initialAuth={{ 
            userId: userId,
            token: "demo-token" // Replace with actual token in production
          }}
          config={{
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 2000,
            reconnectionDelayMax: 10000,
            timeout: 30000,
            showToasts: true,
            url: process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' 
              ? `${window.location.protocol}//${process.env.NEXT_PUBLIC_API_HOST || window.location.hostname}:${process.env.NEXT_PUBLIC_API_PORT || '4100'}`
              : 'http://localhost:4100'),
            // Try both with and without credentials since we don't know if the backend requires them
            withCredentials: false, 
            extraHeaders: {
              "x-client-version": "1.0.0",
              "x-client-hostname": typeof window !== 'undefined' ? window.location.hostname : 'unknown',
              // Include CORS headers to help with debugging
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Request-Method": "GET,POST,OPTIONS",
            }
          }}
        >
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