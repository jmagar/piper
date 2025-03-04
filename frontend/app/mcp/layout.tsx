import * as React from "react";
import { AppLayout } from '@/components/layout/app-layout';

/**
 * MCP section layout
 * Provides consistent layout for all MCP pages
 */
export default function McpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppLayout title="MCP Servers">
      <div className="container py-4">
        {children}
      </div>
    </AppLayout>
  );
} 