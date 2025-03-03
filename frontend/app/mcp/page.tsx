import { Metadata } from "next";
import Link from "next/link";
import { 
  FileCode, 
  Settings, 
  ServerCrash,
  ArrowRight,
  BarChart,
  Activity
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Model Context Protocol | Pooper",
  description: "Manage and monitor your MCP servers",
};

/**
 * MCP Overview Page - Server Component
 * This page serves as an overview dashboard for MCP functionality
 */
export default function McpPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Model Context Protocol</h1>
        <p className="text-muted-foreground">
          Manage, monitor, and configure your MCP servers and tools
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Logs Card */}
        <Card className="hover:shadow-md transition-shadow">
          <div className="pb-3 p-6">
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-medium">Logs</h3>
              <FileCode className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              View and monitor real-time server logs
            </p>
          </div>
          <div className="p-6 pt-0">
            <p className="text-sm text-muted-foreground">
              Monitor debug, info, and error logs from all MCP servers to diagnose issues and track performance.
            </p>
          </div>
          <div className="p-6 border-t border-border flex items-center">
            <Link href="/mcp/logs" className="w-full">
              <Button variant="ghost" className="w-full justify-between">
                View Logs
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </Card>
        
        {/* Configuration Card */}
        <Card className="hover:shadow-md transition-shadow">
          <div className="pb-3 p-6">
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-medium">Configuration</h3>
              <Settings className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Manage MCP server configuration
            </p>
          </div>
          <div className="p-6 pt-0">
            <p className="text-sm text-muted-foreground">
              Edit LLM settings, configure MCP servers, manage environment variables, and set up tool access.
            </p>
          </div>
          <div className="p-6 border-t border-border flex items-center">
            <Link href="/mcp/config" className="w-full">
              <Button variant="ghost" className="w-full justify-between">
                Edit Configuration
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </Card>
        
        {/* Servers Card */}
        <Card className="hover:shadow-md transition-shadow">
          <div className="pb-3 p-6">
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-medium">Servers</h3>
              <ServerCrash className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Manage MCP server deployments
            </p>
          </div>
          <div className="p-6 pt-0">
            <p className="text-sm text-muted-foreground">
              View server health, restart servers, and manage tool registrations across your MCP ecosystem.
            </p>
          </div>
          <div className="p-6 border-t border-border flex items-center">
            <Link href="/mcp/servers" className="w-full">
              <Button variant="ghost" className="w-full justify-between">
                Manage Servers
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </Card>
        
        {/* Stats Card */}
        <Card className="hover:shadow-md transition-shadow">
          <div className="pb-3 p-6">
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-medium">Analytics</h3>
              <BarChart className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              View usage statistics and metrics
            </p>
          </div>
          <div className="p-6 pt-0">
            <p className="text-sm text-muted-foreground">
              Analyze tool usage patterns, track error rates, and monitor performance metrics for optimization.
            </p>
          </div>
          <div className="p-6 border-t border-border flex items-center">
            <Button variant="ghost" className="w-full justify-between" disabled>
              Coming Soon
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </Card>
        
        {/* Health Card */}
        <Card className="hover:shadow-md transition-shadow">
          <div className="pb-3 p-6">
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-medium">Health</h3>
              <Activity className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Monitor server health and status
            </p>
          </div>
          <div className="p-6 pt-0">
            <p className="text-sm text-muted-foreground">
              Check server health, view uptime metrics, and receive alerts for service interruptions.
            </p>
          </div>
          <div className="p-6 border-t border-border flex items-center">
            <Button variant="ghost" className="w-full justify-between" disabled>
              Coming Soon
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
} 