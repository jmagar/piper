"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Info } from "lucide-react";
import McpLogsViewer from "@/components/mcp/log-viewer";

/**
 * Client-side MCP Log Viewer Page component
 */
export function LogViewerClient() {
  const [selectedServer, setSelectedServer] = React.useState<string>("all");
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">MCP Logs</h1>
        <p className="text-muted-foreground">
          Monitor and filter logs from MCP servers in real-time
        </p>
      </div>
      
      <Tabs defaultValue="live" className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="live">Live Logs</TabsTrigger>
            <TabsTrigger value="history">Log History</TabsTrigger>
            <TabsTrigger value="stream">Stream Health</TabsTrigger>
          </TabsList>
          
          <div className="flex items-center gap-2">
            <Select
              value={selectedServer || "all"}
              onValueChange={setSelectedServer}
            >
              <SelectTrigger className="w-[200px]" fullWidth={false}>
                <SelectValue placeholder="All Servers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Servers</SelectItem>
                <SelectItem value="memory">Memory Server</SelectItem>
                <SelectItem value="searxng">SearXNG Server</SelectItem>
                <SelectItem value="filesystem">Filesystem Server</SelectItem>
                <SelectItem value="weather">Weather Server</SelectItem>
                <SelectItem value="brave-search">Brave Search Server</SelectItem>
                <SelectItem value="github">GitHub Server</SelectItem>
                <SelectItem value="time">Time Server</SelectItem>
                <SelectItem value="shell">Shell Server</SelectItem>
                <SelectItem value="puppeteer">Puppeteer Server</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <TabsContent value="live" className="mt-0">
          <Card>
            <div className="p-6 pb-3">
              <h3 className="text-lg font-medium">Live Logs</h3>
              <p className="text-sm text-muted-foreground">
                Real-time logs from MCP servers via WebSocket connection
              </p>
            </div>
            <div className="p-6 pt-0 h-[calc(100vh-300px)]">
              <McpLogsViewer 
                url={selectedServer !== "all" ? `/api/mcp/servers/${selectedServer}` : undefined} 
                maxLogs={1000} 
              />
            </div>
          </Card>
        </TabsContent>
        
        <TabsContent value="history" className="mt-0">
          <Card>
            <div className="p-6 pb-3">
              <h3 className="text-lg font-medium">Log History</h3>
              <p className="text-sm text-muted-foreground">
                Historical logs retrieved from the database
              </p>
            </div>
            <div className="p-6 pt-0 h-[calc(100vh-300px)]">
              <div className="flex flex-col items-center justify-center h-full space-y-4 text-muted-foreground">
                <Info className="h-12 w-12" />
                <p className="text-center max-w-md">
                  Log history feature is coming soon. This will allow you to search and filter historical logs stored in the database.
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>
        
        <TabsContent value="stream" className="mt-0">
          <Card>
            <div className="p-6 pb-3">
              <h3 className="text-lg font-medium">Stream Health</h3>
              <p className="text-sm text-muted-foreground">
                Monitor health metrics for MCP streams
              </p>
            </div>
            <div className="p-6 pt-0 h-[calc(100vh-300px)]">
              <div className="flex flex-col items-center justify-center h-full space-y-4 text-muted-foreground">
                <Info className="h-12 w-12" />
                <p className="text-center max-w-md">
                  Stream health monitoring is coming soon. This will display metrics about WebSocket connections, message rates, and error rates.
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 