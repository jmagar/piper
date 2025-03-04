"use client";

import * as React from 'react';
import { Bot, Wrench, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

/**
 * Props for the McpServerStats component
 */
interface McpServerStatsProps {
  /** When true, displays a compact version of the component */
  compact?: boolean;
}

type ServerStatus = 'online' | 'offline' | 'error';

interface McpServer {
  id: string;
  name: string;
  status: ServerStatus;
  lastUsed: string;
  toolCount: number;
  usageCount: number;
}

interface McpTool {
  id: string;
  name: string;
  serverId: string;
  usageCount: number;
  lastUsed: string;
}

/**
 * McpServerStats Component
 * 
 * Displays statistics about the user's interaction with MCP servers and tools
 */
export function McpServerStats({ compact = false }: McpServerStatsProps) {
  // Mock data - in a real implementation, these would be fetched from an API with user-specific data
  const [servers, setServers] = React.useState<McpServer[]>([
    {
      id: '1',
      name: 'OpenAI Server',
      status: 'online',
      lastUsed: '2024-03-01T12:30:45Z',
      toolCount: 5,
      usageCount: 126
    },
    {
      id: '2',
      name: 'Anthropic Claude',
      status: 'online',
      lastUsed: '2024-03-03T08:15:22Z',
      toolCount: 3,
      usageCount: 84
    },
    {
      id: '3',
      name: 'Local LLM',
      status: 'offline',
      lastUsed: '2024-02-28T15:45:12Z',
      toolCount: 2,
      usageCount: 32
    },
    {
      id: '4',
      name: 'Mistral AI',
      status: 'online',
      lastUsed: '2024-03-02T14:22:18Z',
      toolCount: 2,
      usageCount: 41
    }
  ]);

  const [tools, setTools] = React.useState<McpTool[]>([
    { id: '1', name: 'Web Search', serverId: '1', usageCount: 42, lastUsed: '2024-03-03T10:12:45Z' },
    { id: '2', name: 'Image Generation', serverId: '1', usageCount: 28, lastUsed: '2024-03-02T16:30:22Z' },
    { id: '3', name: 'Code Interpreter', serverId: '2', usageCount: 36, lastUsed: '2024-03-03T09:45:33Z' },
    { id: '4', name: 'Document Analysis', serverId: '1', usageCount: 18, lastUsed: '2024-03-01T11:22:05Z' },
    { id: '5', name: 'SQL Generator', serverId: '3', usageCount: 12, lastUsed: '2024-02-28T14:18:42Z' }
  ]);

  // Sort servers by usage count (most used first)
  const sortedServers = [...servers].sort((a, b) => b.usageCount - a.usageCount);
  
  // Sort tools by usage count (most used first)
  const sortedTools = [...tools].sort((a, b) => b.usageCount - a.usageCount);
  
  // Format date to a more readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Get status color based on server status
  const getStatusColor = (status: ServerStatus) => {
    switch (status) {
      case 'online':
        return 'text-green-500';
      case 'offline':
        return 'text-gray-500';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  // Get status icon based on server status
  const getStatusIcon = (status: ServerStatus) => {
    switch (status) {
      case 'online':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'offline':
        return <XCircle className="h-4 w-4 text-gray-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  if (compact) {
    return (
      <div className="space-y-2">
        <h3 className="font-medium">Your MCP Servers</h3>
        <div className="space-y-1">
          {sortedServers.slice(0, 3).map(server => (
            <div key={server.id} className="flex items-center justify-between">
              <div className="flex items-center">
                {getStatusIcon(server.status)}
                <span className="ml-2 text-sm">{server.name}</span>
              </div>
              <span className="text-xs text-muted-foreground">{server.usageCount} uses</span>
            </div>
          ))}
        </div>
        <div className="mt-3 text-xs text-muted-foreground">
          {servers.length} servers with {tools.length} tools
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Your MCP Servers</CardTitle>
            <CardDescription>
              Model Context Protocol servers you've connected to
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {sortedServers.map(server => (
              <div key={server.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                <div>
                  <div className="flex items-center">
                    {getStatusIcon(server.status)}
                    <span className="ml-2 font-medium">{server.name}</span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Last used: {formatDate(server.lastUsed)}
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <Badge variant="outline">{server.toolCount} tools</Badge>
                  <span className="mt-1 text-xs">{server.usageCount} uses</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Your Most Used MCP Tools</CardTitle>
            <CardDescription>
              Tools you've accessed through MCP servers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sortedTools.slice(0, 5).map(tool => {
                const server = servers.find(s => s.id === tool.serverId);
                return (
                  <div key={tool.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                    <div>
                      <div className="flex items-center">
                        <Wrench className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span className="font-medium">{tool.name}</span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Via: {server?.name || 'Unknown server'}
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-sm">{tool.usageCount} uses</span>
                      <span className="mt-1 text-xs text-muted-foreground">
                        Last: {formatDate(tool.lastUsed)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 