"use client";

import * as React from 'react';
import { Bot, Wrench, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';

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
  const [servers, setServers] = useState<McpServer[]>([]);
  const [currentModel, setCurrentModel] = useState<{provider: string; model: string}>({
    provider: '',
    model: ''
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // This would be an API call in a real implementation
    // For now we'll populate with data derived from the config file
    const fetchServersAndModel = async () => {
      setIsLoading(true);
      try {
        // In a real implementation, we would fetch from an API endpoint
        // that retrieves data from the llm_mcp_config.json5 file
        const mockServers: McpServer[] = [
          {
            id: '1',
            name: 'OpenAI Server',
            status: 'online',
            lastUsed: new Date().toISOString(),
            toolCount: 5,
            usageCount: 126
          },
          {
            id: '2',
            name: 'Anthropic Claude',
            status: 'online',
            lastUsed: new Date().toISOString(),
            toolCount: 3,
            usageCount: 84
          },
          {
            id: '3',
            name: 'Local LLM',
            status: 'offline',
            lastUsed: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
            toolCount: 2,
            usageCount: 32
          },
          {
            id: '4',
            name: 'Mistral AI',
            status: 'online',
            lastUsed: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
            toolCount: 2,
            usageCount: 41
          }
        ];
        
        // Set model info from config (mocked here)
        const modelInfo = {
          provider: 'anthropic',
          model: 'claude-3-5-sonnet-20240620'
        };
        
        setServers(mockServers);
        setCurrentModel(modelInfo);
      } catch (error) {
        console.error('Error fetching MCP servers:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchServersAndModel();
  }, []);

  const [tools] = useState<McpTool[]>([
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

  if (isLoading) {
    return (
      <div className="space-y-2">
        <h3 className="font-medium">Your MCP Servers</h3>
        <div className="animate-pulse space-y-2">
          <div className="h-6 bg-muted rounded"></div>
          <div className="h-6 bg-muted rounded"></div>
          <div className="h-6 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="space-y-2">
        <h3 className="font-medium">Your MCP Servers</h3>
        {currentModel.model && (
          <div className="border-b pb-2 mb-2">
            <div className="text-xs text-muted-foreground">Current Model</div>
            <div className="text-sm font-medium">{currentModel.model}</div>
            <div className="text-xs">{currentModel.provider}</div>
          </div>
        )}
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
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Current LLM</h3>
      <div className="border rounded-lg p-3 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">{currentModel.model}</div>
            <div className="text-xs text-muted-foreground capitalize">{currentModel.provider}</div>
          </div>
          <Badge variant="outline">Active</Badge>
        </div>
      </div>
      
      <h3 className="text-lg font-medium">Available Servers</h3>
      <div className="space-y-3">
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
      </div>
    </div>
  );
} 