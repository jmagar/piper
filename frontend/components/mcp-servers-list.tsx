'use client';

import { useEffect, useState } from 'react';

import { toast } from 'sonner';

import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { mcpApi } from '@/lib/api-client';
import { formatBytes } from '@/lib/utils';


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

interface McpServersListProps {
  servers: McpServer[];
}

export function McpServersList({ servers }: McpServersListProps) {
  if (servers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardDescription>No MCP servers available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {servers.map((server) => (
        <Card key={server.name}>
          <CardHeader>
            <h3 className="text-lg font-semibold">{server.name}</h3>
            <CardDescription>
              Status: <span className={server.status === 'ok' ? 'text-green-500' : 'text-red-500'}>
                {server.status}
              </span>
              {server.error ? <span className="text-red-500 ml-2">({server.error})</span> : null}
            </CardDescription>
          </CardHeader>
          {server.memoryUsage ? <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Memory Usage:
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p>Heap Used: {formatBytes(server.memoryUsage.heapUsed)}</p>
                  <p>Heap Total: {formatBytes(server.memoryUsage.heapTotal)}</p>
                  <p>External: {formatBytes(server.memoryUsage.external)}</p>
                  <p>RSS: {formatBytes(server.memoryUsage.rss)}</p>
                </div>
              </div>
            </CardContent> : null}
        </Card>
      ))}
    </div>
  );
}
