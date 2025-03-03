import * as React from "react";

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
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">{children}</main>
    </div>
  );
} 