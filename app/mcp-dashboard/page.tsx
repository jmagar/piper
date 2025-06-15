"use client"

import { LayoutApp } from "@/app/components/layout/layout-app";
import { McpServersDashboard } from "@/app/components/mcp-servers/McpServersDashboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LogViewer from "@/app/components/log-viewer";
import McpMetricsDashboard from "@/app/components/dashboard/mcp-metrics-dashboard";

export default function McpDashboardPage() {
  return (
    <LayoutApp>
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 flex flex-col flex-grow">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">MCP Server Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          View status and tools of connected MCP servers. Hover over a server for more details.
        </p>
      </div>
      {/* Separator can be removed or kept depending on desired styling with tabs */}
      {/* <Separator className="my-6" /> */}
      <Tabs defaultValue="servers" className="w-full flex-grow flex flex-col">
        <TabsList className="mb-4 self-start">
          <TabsTrigger value="servers">Servers</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
        </TabsList>
        <TabsContent value="servers" className="flex-grow">
          <McpServersDashboard />
        </TabsContent>
        <TabsContent value="logs" className="flex-grow">
          <LogViewer />
        </TabsContent>
        <TabsContent value="monitoring" className="flex-grow">
          <McpMetricsDashboard />
        </TabsContent>
      </Tabs>
    </div>
    </LayoutApp>
  );
}
