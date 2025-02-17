import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider } from "@/components/ui/sidebar"
import { Info, Server } from "lucide-react"

interface ServerInfo {
  name: string;
  status: 'running' | 'stopped' | 'error';
  error?: string;
  lastChecked: string;
  toolCount: number;
  env: string[];
  command: string;
  args: string[];
}

function ServerSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-[150px]" />
          <Skeleton className="h-5 w-[100px]" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Skeleton className="h-4 w-[200px]" />
          <Skeleton className="h-4 w-[150px]" />
        </div>
      </CardContent>
    </Card>
  )
}

export function McpServersList() {
  const [servers, setServers] = useState<ServerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchServers = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4100'}/api/servers`);
        if (!response.ok) {
          throw new Error('Failed to fetch servers');
        }
        const data = await response.json();
        setServers(data.servers);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch servers');
      } finally {
        setLoading(false);
      }
    };

    fetchServers();
  }, []);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="p-4 space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <ServerSkeleton key={`skeleton-${index}`} />
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4 p-4">
          <Info className="w-12 h-12 text-red-500" />
          <div className="text-center">
            <h3 className="text-lg font-semibold text-red-500">Error Loading Servers</h3>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b flex items-center justify-between bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5" />
            <h2 className="text-lg font-semibold">MCP Servers</h2>
          </div>
          <span className="text-sm text-muted-foreground">
            {servers.length} servers available
          </span>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4">
            {servers.map((server) => (
              <Card key={server.name}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{server.name}</CardTitle>
                    <Badge
                      variant={
                        server.status === 'running'
                          ? 'success'
                          : server.status === 'error'
                          ? 'destructive'
                          : 'secondary'
                      }
                    >
                      {server.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-sm">
                      <span className="text-muted-foreground">Command: </span>
                      {server.command} {server.args.join(' ')}
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Last checked: </span>
                      {new Date(server.lastChecked).toLocaleString()}
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Tools available: </span>
                      {server.toolCount}
                    </div>
                    {server.error && (
                      <div className="text-sm text-destructive">{server.error}</div>
                    )}
                    {server.env.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {server.env.map((env) => (
                          <Badge key={env} variant="outline">
                            {env}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <main className="flex-1 w-full overflow-hidden">
          {renderContent()}
        </main>
      </div>
    </SidebarProvider>
  );
} 