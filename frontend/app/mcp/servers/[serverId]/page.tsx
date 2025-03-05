import { Metadata } from "next";
import { ServerDetailClient } from "./client";

export const metadata: Metadata = {
  title: "Server Details | MCP | Pooper",
  description: "Detailed information about an MCP server",
};

/**
 * MCP Server Detail Page - Server Component
 * This page displays detailed information about a specific MCP server
 */
export default function ServerDetailPage({ params }: { params: { serverId: string } }) {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Server Details</h1>
        <p className="text-muted-foreground">
          Detailed information and management for this MCP server
        </p>
      </div>
      
      {/* Client component for fetching and displaying server data */}
      <ServerDetailClient serverId={params.serverId} />
    </div>
  );
}
