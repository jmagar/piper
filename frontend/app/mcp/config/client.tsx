"use client";

import * as React from "react";
import dynamic from "next/dynamic";

// Import the MCP Config Viewer component dynamically to avoid SSR issues
const McpConfigViewer = dynamic(
  () => import("@/components/mcp-config-viewer").then(mod => mod.default),
  { ssr: false }
);

/**
 * MCP Config Client Component
 * This is a client component that renders the configuration editor
 */
export function ConfigClient() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">MCP Configuration</h1>
        <p className="text-muted-foreground">
          Manage Model Context Protocol servers and settings
        </p>
      </div>
      
      <div className="w-full h-[calc(100vh-200px)]">
        <McpConfigViewer />
      </div>
    </div>
  );
} 