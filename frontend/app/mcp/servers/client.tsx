"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  ServerCrash, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  RefreshCw,
  AlertTriangle,
  Activity,
  Clock,
  Network,
  Wrench,
  Clock3,
  ArrowUpDown,
  ExternalLink
} from "lucide-react";

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

// Define the server type based on the OpenAPI schema
interface McpServerHealth {
  status: string;
  lastChecked?: string;
  responseTime?: number;
}

interface McpServerTools {
  count: number;
  names: string[];
  categories?: Record<string, string[]>;
}

interface McpServerStats {
  requests: number;
  errors: number;
  uptime: number;
  successRate?: number;
}

interface McpServerMetadata {
  health?: McpServerHealth;
  tools?: McpServerTools;
  stats?: McpServerStats;
  version?: string;
  capabilities?: string[];
}

interface McpServer {
  id: string;
  name: string;
  url: string;
  type: string;
  transport?: string;
  status: string;
  metadata?: McpServerMetadata;
  createdAt: string;
  updatedAt: string;
}

interface McpServerListResponse {
  servers: McpServer[];
}

export function ServersClient() {
  const router = useRouter();
  const [servers, setServers] = useState<McpServer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchServers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/mcp/servers");
      
      if (!response.ok) {
        throw new Error(`Failed to fetch servers: ${response.status}`);
      }
      
      const data = await response.json() as McpServerListResponse;
      setServers(data.servers || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load servers");
      console.error("Error fetching servers:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshServers = async () => {
    setIsRefreshing(true);
    await fetchServers();
    setIsRefreshing(false);
  };

  useEffect(() => {
    fetchServers();
  }, []);

  // Helper function to render status badge with appropriate color
  const renderStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
      case "online":
      case "healthy":
        return (
          <div className="flex items-center justify-center">
            <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
            <Badge variant="outline" className="text-green-500 border-green-200 bg-green-50">
              {status}
            </Badge>
          </div>
        );
      case "degraded":
      case "warning":
        return (
          <div className="flex items-center justify-center">
            <AlertTriangle className="h-4 w-4 text-yellow-500 mr-1" />
            <Badge variant="outline" className="text-yellow-500 border-yellow-200 bg-yellow-50">
              {status}
            </Badge>
          </div>
        );
      case "offline":
      case "error":
      case "unhealthy":
      case "inactive":
      case "maintenance":
        return (
          <div className="flex items-center justify-center">
            <AlertCircle className="h-4 w-4 text-red-500 mr-1" />
            <Badge variant="outline" className="text-red-500 border-red-200 bg-red-50">
              {status}
            </Badge>
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-center">
            <Badge variant="outline" className="text-gray-500">
              {status}
            </Badge>
          </div>
        );
    }
  };

  // Render transport type with appropriate icon
  const renderTransportType = (transportType: string) => {
    const transportIcon = () => {
      switch (transportType.toLowerCase()) {
        case "ssse":
          return <Activity className="h-4 w-4 mr-1" />;
        case "stdio":
          return <ArrowUpDown className="h-4 w-4 mr-1" />;
        case "websocket":
          return <Network className="h-4 w-4 mr-1" />;
        case "http":
          return <ExternalLink className="h-4 w-4 mr-1" />;
        default:
          return <Network className="h-4 w-4 mr-1" />;
      }
    };
    
    return (
      <div className="flex items-center">
        {transportIcon()}
        <span className="capitalize">{transportType}</span>
      </div>
    );
  };

  // Format uptime in a human-readable format
  const formatUptime = (seconds: number) => {
    if (!seconds) return "N/A";
    
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  // Render response time with color-coded indicator
  const renderResponseTime = (responseTime?: number) => {
    if (!responseTime) return <span className="text-gray-400">N/A</span>;
    
    let colorClass = "text-green-500";
    if (responseTime > 200) colorClass = "text-yellow-500";
    if (responseTime > 500) colorClass = "text-red-500";
    
    return (
      <div className="flex items-center justify-center">
        <Clock className={`h-4 w-4 ${colorClass} mr-1`} />
        <span className={colorClass}>{responseTime}ms</span>
      </div>
    );
  };

  // Render tools with categorized tooltips
  const renderTools = (server: McpServer) => {
    const tools = server.metadata?.tools;
    if (!tools || tools.count === 0) {
      return <Badge variant="outline" className="bg-gray-50">No tools</Badge>;
    }
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center justify-center cursor-help">
              <Wrench className="h-4 w-4 text-blue-500 mr-1" />
              <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 border border-blue-300">
                {tools.count}
              </Badge>
            </div>
          </TooltipTrigger>
          <TooltipContent className="w-[300px] p-0" align="center">
            <Card className="border-0 shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Available Tools</CardTitle>
                <CardDescription className="text-xs">
                  {server.name} provides {tools.count} tools
                </CardDescription>
              </CardHeader>
              <Separator />
              <CardContent className="pt-2 pb-0">
                <ScrollArea className="h-[200px] pr-3">
                  {tools.categories && Object.keys(tools.categories).length > 0 ? (
                    <div className="space-y-3">
                      {Object.entries(tools.categories).map(([category, toolList]) => (
                        <div key={category} className="space-y-1">
                          <h4 className="text-sm font-medium">{category}</h4>
                          <ul className="grid grid-cols-2 gap-1">
                            {toolList.map((tool, idx) => (
                              <li key={idx} className="text-xs flex items-center">
                                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 mr-1.5"></span>
                                {tool}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <ul className="space-y-1 pl-2">
                      {tools.names.map((tool, idx) => (
                        <li key={idx} className="text-sm flex items-center">
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-500 mr-1.5"></span>
                          {tool}
                        </li>
                      ))}
                    </ul>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  // Render success rate with progress bar
  const renderSuccessRate = (server: McpServer) => {
    const stats = server.metadata?.stats;
    if (!stats) return <span className="text-gray-400">N/A</span>;
    
    // Calculate success rate if not provided
    const successRate = stats.successRate || 
      (stats.requests > 0 ? ((stats.requests - stats.errors) / stats.requests) * 100 : 0);
    
    let colorClass = "bg-green-500";
    if (successRate < 95) colorClass = "bg-yellow-500";
    if (successRate < 80) colorClass = "bg-red-500";
    
    return (
      <div className="w-full space-y-1">
        <div className="flex justify-between text-xs">
          <span>{Math.round(successRate)}%</span>
          <span className="text-muted-foreground">{stats.requests} req</span>
        </div>
        <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
          <div 
            className={`h-full ${colorClass}`} 
            style={{ width: `${Math.min(100, Math.max(0, successRate))}%` }}
          ></div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="w-full flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-xl">Loading servers...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-red-500 flex items-center">
            <AlertCircle className="mr-2" />
            Error Loading Servers
          </CardTitle>
          <CardDescription>
            There was a problem loading the server data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">{error}</p>
        </CardContent>
        <CardFooter>
          <Button onClick={refreshServers} disabled={isRefreshing}>
            {isRefreshing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Retrying...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (servers.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center">
            <ServerCrash className="mr-2" />
            No Servers Found
          </CardTitle>
          <CardDescription>
            No MCP servers have been configured yet
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Add your first MCP server to get started</p>
        </CardContent>
        <CardFooter>
          <Button onClick={refreshServers} disabled={isRefreshing} className="mr-2">
            {isRefreshing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </>
            )}
          </Button>
          <Button onClick={() => router.push("/mcp/config")}>
            Configure Servers
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-muted p-3 rounded-lg">
        <div>
          <span className="font-medium">
            {servers.length} {servers.length === 1 ? "server" : "servers"} found
          </span>
          <p className="text-sm text-muted-foreground">
            Showing all configured MCP servers and their current status
          </p>
        </div>
        <Button 
          onClick={refreshServers} 
          disabled={isRefreshing}
          variant="secondary"
          size="sm"
        >
          {isRefreshing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Refreshing...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Servers
            </>
          )}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableCaption>List of configured MCP servers and their current status</TableCaption>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-[200px]">Server Name</TableHead>
                <TableHead>Transport</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Response Time</TableHead>
                <TableHead className="text-center">Tools</TableHead>
                <TableHead className="text-center">Success Rate</TableHead>
                <TableHead className="text-center">Uptime</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {servers.map((server) => (
                <TableRow key={server.id} className="h-16">
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{server.name}</span>
                      <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                        {server.url}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {/* Safely handle the transport by providing a default */}
                    {renderTransportType(server.transport || "unknown")}
                  </TableCell>
                  <TableCell className="text-center">
                    {renderStatusBadge(server.status)}
                  </TableCell>
                  <TableCell className="text-center">
                    {renderResponseTime(server.metadata?.health?.responseTime)}
                  </TableCell>
                  <TableCell className="text-center">
                    {renderTools(server)}
                  </TableCell>
                  <TableCell>
                    {renderSuccessRate(server)}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center text-muted-foreground">
                      <Clock3 className="h-4 w-4 mr-1" />
                      {server.metadata?.stats ? (
                        formatUptime(server.metadata.stats.uptime)
                      ) : (
                        "N/A"
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => router.push(`/mcp/servers/${server.id}`)}
                      className="text-xs h-8"
                    >
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
} 