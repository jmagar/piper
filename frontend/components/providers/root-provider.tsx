"use client"

import * as React from 'react';

import { ThemeProvider } from "@/components/providers/theme-provider"
import { SocketProvider } from "@/lib/socket-provider"

interface RootProviderProps {
    children: React.ReactNode;
}

export function RootProvider({ children }: RootProviderProps) {
    return (
        <SocketProvider>
            <ThemeProvider>
                {children}
            </ThemeProvider>
        </SocketProvider>
    );
} 