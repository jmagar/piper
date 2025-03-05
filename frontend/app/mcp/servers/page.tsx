import { Metadata } from "next";
import { ServersClient } from "./client";

export const metadata: Metadata = {
  title: "Servers | Model Context Protocol | Pooper",
  description: "Manage and monitor your MCP servers",
};

/**
 * MCP Servers Page - Server Component
 * This page serves as a dashboard to display information about all configured MCP servers
 */
export default function ServersPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">MCP Servers</h1>
        <p className="text-muted-foreground">
          View status, health, and tools for all your configured MCP servers
        </p>
      </div>
      
      {/* Client component for fetching and displaying server data */}
      <ServersClient />
    </div>
  );
} 