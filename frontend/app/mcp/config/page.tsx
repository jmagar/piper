import { Metadata } from "next";
import { ConfigClient } from "./client";

export const metadata: Metadata = {
  title: "MCP Configuration | Pooper",
  description: "Configure your MCP servers and settings",
};

/**
 * MCP Configuration Page
 * This is a placeholder page that will be rebuilt later
 */
export default function ConfigPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">MCP Configuration</h1>
        <p className="text-muted-foreground">
          Configure your MCP servers and settings
        </p>
      </div>
      <ConfigClient />
    </div>
  );
} 