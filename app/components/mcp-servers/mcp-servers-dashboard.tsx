// app/components/mcp-servers/mcp-servers-dashboard.tsx
'use client';

import { useEffect, useState } from 'react';
import { McpServerInfo } from '@/app/api/mcp-servers/route'; // Adjust path if necessary
import { Badge } from '@/components/ui/badge';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, CheckCircle2, HelpCircle, Server, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const StatusIndicator = ({ status, className }: { status: McpServerInfo['status'], className?: string }) => {
    const baseClasses = "h-4 w-4"; // Reduced size
  switch (status) {
    case 'connected':
            return <CheckCircle2 className={cn(baseClasses, "text-green-500", className)} />;
    case 'error':
            return <XCircle className={cn(baseClasses, "text-red-500", className)} />;
    case 'no_tools_found':
            return <AlertCircle className={cn(baseClasses, "text-yellow-500", className)} />;
    case 'uninitialized': // Should ideally not be seen if API processes fully
    default:
            return <HelpCircle className={cn(baseClasses, "text-gray-400", className)} />;
  }
};

export function McpServersDashboard() {
  const [servers, setServers] = useState<McpServerInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/mcp-servers');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Error: ${response.status}`);
        }
        const data: McpServerInfo[] = await response.json();
        setServers(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to fetch server data');
        setServers([]); // Clear any existing server data on error
      }
      setIsLoading(false);
    }
    fetchData();
  }, []);

  if (isLoading) {
    return <p className="text-center text-muted-foreground">Loading MCP server information...</p>;
  }

  if (error) {
    return <p className="text-center text-red-500">Error: {error}</p>;
  }

  if (servers.length === 0) {
    return <p className="text-center text-muted-foreground">No MCP servers configured or found.</p>;
  }

  return (
    <ScrollArea className="h-[240px] rounded-md border p-1 md:p-2">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-5 xl:grid-cols-5 gap-1">
        {servers.map((server) => (
          <HoverCard key={server.key} openDelay={200} closeDelay={100}>
            <HoverCardTrigger asChild>
              <div className="flex items-center justify-between rounded-md border p-1 transition-all hover:shadow-md cursor-pointer h-full">
                <div className="flex items-center space-x-1 flex-grow min-w-0">
                  <StatusIndicator status={server.status} />
                  <div className="flex-grow min-w-0">
                    <p className="font-medium text-xs truncate" title={server.label}>{server.label}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {server.transportType ? `Type: ${server.transportType}` : ''}
                      {server.status === 'error' && server.errorDetails ? ` - Err: ${server.errorDetails.substring(0,30)}...` : ''}
                      {server.status === 'no_tools_found' ? ' - No tools' : ''}
                      {server.status === 'connected' ? ` - ${server.tools.length} tool(s)` : ''}
                    </p>
                  </div>
                </div>
                {/* <Server className="h-4 w-4 text-muted-foreground flex-shrink-0" /> */}
              </div>
            </HoverCardTrigger>
            <HoverCardContent className="w-64 md:w-72 max-h-48 overflow-y-auto" side="right" align="start">
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">{server.label} - Tools</h4>
                {server.tools.length > 0 ? (
                  <ul className="list-disc space-y-1 pl-4 text-xs">
                    {server.tools.map((tool) => (
                      <li key={tool.name}>
                        <span className="font-medium">{tool.name}</span>
                        {tool.description && <p className="text-[11px] text-muted-foreground">{tool.description}</p>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {server.status === 'error' ? `Error: ${server.errorDetails}` : 'No tools available or server not connected.'}
                  </p>
                )}
              </div>
            </HoverCardContent>
          </HoverCard>
        ))}
      </div>
    </ScrollArea>
  );
}
