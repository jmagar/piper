"use client"

import * as React from 'react';
import { Toaster } from "sonner"

import { RootProvider } from "@/components/providers/root-provider"

interface ClientLayoutProps {
    children: React.ReactNode;
    className?: string;
}

export function ClientLayout({ children, className }: ClientLayoutProps) {
    return (
        <body className={className}>
            <RootProvider>
                {children}
            </RootProvider>
            <Toaster />
        </body>
    );
} 