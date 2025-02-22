'use client';

import { useCallback, useEffect, useState } from 'react';

import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { mcpService } from '@/lib/api-client';

import { McpServersList } from './mcp-servers-list';

interface McpServer {
  name?: string;
  status?: 'ok' | 'error';
  error?: string;
  memoryUsage?: {
    heapUsed?: number;
    heapTotal?: number;
    external?: number;
    rss?: number;
  };
}

type ServerResponse = NonNullable<Awaited<ReturnType<typeof mcpService.getMcpHealth>>['servers']>[number];

function isValidServerArray(servers: unknown): servers is ServerResponse[] {
  return Array.isArray(servers) && servers.every(server => 
    typeof server === 'object' && 
    server !== null && 
    'name' in server
  );
}

function isValidMemoryUsage(memoryUsage: unknown): memoryUsage is NonNullable<ServerResponse['memoryUsage']> {
  return typeof memoryUsage === 'object' && 
    memoryUsage !== null && 
    'heapUsed' in memoryUsage &&
    'heapTotal' in memoryUsage &&
    'external' in memoryUsage &&
    'rss' in memoryUsage;
}

export function McpServersContainer() {
  const [servers, setServers] = useState<McpServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchServers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await mcpService.getMcpHealth();
      
      if (response.servers && isValidServerArray(response.servers)) {
        const transformedServers = response.servers.map((server: ServerResponse) => ({
          name: server.name,
          status: server.status as 'ok' | 'error',
          error: server.error,
          memoryUsage: isValidMemoryUsage(server.memoryUsage) ? {
            heapUsed: server.memoryUsage.heapUsed,
            heapTotal: server.memoryUsage.heapTotal,
            external: server.memoryUsage.external,
            rss: server.memoryUsage.rss
          } : undefined
        }));
        setServers(transformedServers);
      } else {
        setServers([]);
      }
    } catch (err) {
      globalThis.console.error('Failed to fetch MCP servers:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch MCP servers';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const interval = globalThis.setInterval(() => {
      if (mounted) {
        void fetchServers();
      }
    }, 30000); // Poll every 30 seconds

    void fetchServers();

    return () => {
      mounted = false;
      globalThis.clearInterval(interval);
    };
  }, [fetchServers]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <p className="text-destructive">{error}</p>
        <Button onClick={() => void fetchServers()} variant="outline">
          Retry
        </Button>
      </div>
    );
  }

  return <McpServersList servers={servers} />;
} 