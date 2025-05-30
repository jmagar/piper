'use client';

import React, { useState, useEffect, useCallback } from 'react';

// Assuming Shadcn UI components are available. Adjust paths if necessary.
import { Button } from '@/components/ui/button'; // Assuming path
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'; // Assuming path
import { Switch } from '@/components/ui/switch'; // Assuming path
import { toast } from 'sonner'; // Assuming you use sonner for toasts, common with Shadcn

// Interfaces (can be moved to a shared types file later)
interface MCPTransportSSE {
  type: 'sse' | 'http';
  url: string;
  headers?: Record<string, string>;
}

interface MCPTransportStdio {
  type: 'stdio';
  command: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
}

type MCPTransport = MCPTransportSSE | MCPTransportStdio;

export interface MCPServerConfigFromUI {
  id: string;
  name: string;
  displayName?: string;
  transport: MCPTransport;
  enabled: boolean;
}

export default function McpServersManager() {
  const [servers, setServers] = useState<MCPServerConfigFromUI[]>([]);
  const [initialServers, setInitialServers] = useState<MCPServerConfigFromUI[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchServers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/mcp-config');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setServers(data);
      setInitialServers(JSON.parse(JSON.stringify(data))); // Deep copy for dirty checking
    } catch (e) {
      console.error('Failed to fetch MCP servers:', e);
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
      setError(errorMessage);
      toast.error(`Failed to load configurations: ${errorMessage}`);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  const handleToggleEnable = (serverId: string) => {
    setServers((prevServers) =>
      prevServers.map((server) =>
        server.id === serverId ? { ...server, enabled: !server.enabled } : server
      )
    );
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch('/api/mcp-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(servers),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save configuration');
      }
      toast.success('Configuration saved successfully!');
      setInitialServers(JSON.parse(JSON.stringify(servers))); // Update initial state after save
      // Optionally, re-fetch to ensure consistency if server-side transformations are complex
      // await fetchServers(); 
    } catch (e) {
      console.error('Failed to save MCP servers:', e);
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
      setError(errorMessage);
      toast.error(`Failed to save configurations: ${errorMessage}`);
    }
    setIsSaving(false);
  };
  
  // Placeholder functions for future implementation
  const handleAddServer = () => {
    toast.info('Add server functionality not yet implemented.');
    // Logic to open a modal/form for a new server
  };

  const handleEditServer = (server: MCPServerConfigFromUI) => {
    toast.info(`Edit server ${server.name} functionality not yet implemented.`);
    // Logic to open a modal/form pre-filled with server data
  };

  const handleDeleteServer = (serverId: string) => {
    // Immediate optimistic update, or confirm first then update
    // For now, just a placeholder
    const serverToDelete = servers.find(s => s.id === serverId);
    toast.warning(`Delete server ${serverToDelete?.name} functionality requires confirmation and is not yet fully implemented.`);
    // setServers(prevServers => prevServers.filter(s => s.id !== serverId));
  };

  const isDirty = JSON.stringify(servers) !== JSON.stringify(initialServers);

  if (isLoading) {
    return <div className="p-4">Loading MCP server configurations...</div>;
  }

  if (error && servers.length === 0) { // Only show full page error if no data could be loaded initially
    return <div className="p-4 text-red-600">Error loading configurations: {error}</div>;
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">MCP Server Configuration Manager</h1>
        <div className="space-x-2">
          <Button onClick={handleAddServer} variant="outline">
            Add New Server
          </Button>
          <Button onClick={handleSaveChanges} disabled={!isDirty || isSaving}>
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </Button>
        </div>
      </div>

      {error && <div className="p-3 bg-red-100 text-red-700 border border-red-300 rounded-md">Error: {error}</div>}

      {servers.length === 0 && !isLoading ? (
        <p>No MCP server configurations found. Click "Add New Server" to get started.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Display Name</TableHead>
              <TableHead>Key Name</TableHead>
              <TableHead>Transport</TableHead>
              <TableHead>Enabled</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {servers.map((server) => (
              <TableRow key={server.id}>
                <TableCell>{server.displayName || server.name}</TableCell>
                <TableCell className="font-mono text-xs">{server.name}</TableCell>
                <TableCell>{server.transport.type}</TableCell>
                <TableCell>
                  <Switch
                    checked={server.enabled}
                    onCheckedChange={() => handleToggleEnable(server.id)}
                    aria-label={`Toggle ${server.name} ${server.enabled ? 'off' : 'on'}`}
                  />
                </TableCell>
                <TableCell className="space-x-2">
                  <Button variant="outline" size="sm" onClick={() => handleEditServer(server)}>
                    Edit
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDeleteServer(server.id)}>
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
