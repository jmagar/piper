// app/components/mcp-servers/mcp-servers-dashboard.tsx
'use client';

import React, { useEffect, useState, useCallback, FormEvent } from 'react';
import { McpServerInfo } from '@/app/api/mcp-servers/route';

// Import UI components from manager.tsx
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

// Icons
import { AlertCircle, CheckCircle2, HelpCircle, XCircle, Plus, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Import interfaces from manager.tsx
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
  // Existing status-only state for dashboard view
  const [servers, setServers] = useState<McpServerInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New configuration management state
  const [configServers, setConfigServers] = useState<MCPServerConfigFromUI[]>([]);
  const [initialConfigServers, setInitialConfigServers] = useState<MCPServerConfigFromUI[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Modal and form states
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingServer, setEditingServer] = useState<MCPServerConfigFromUI | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [deletingServer, setDeletingServer] = useState<MCPServerConfigFromUI | null>(null);
  const [newServerForm, setNewServerForm] = useState<MCPServerConfigFromUI>({
    id: '',
    name: '',
    displayName: '',
    enabled: true,
    transport: { type: 'stdio', command: '' },
  });

  // Fetch server status from /api/mcp-servers
  const fetchServerStatus = useCallback(async () => {
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
  }, []);

  // Fetch configuration servers from /api/mcp-config
  const fetchConfigServers = useCallback(async () => {
    setError(null);
    try {
      const response = await fetch('/api/mcp-config');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setConfigServers(data);
      setInitialConfigServers(JSON.parse(JSON.stringify(data))); // Deep copy for dirty checking
    } catch (e) {
      console.error('Failed to fetch MCP server configurations:', e);
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
      setError(errorMessage);
      toast.error(`Failed to load configurations: ${errorMessage}`);
    }
  }, []);

  // Fetch both status and configuration data
  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([
      fetchServerStatus(),
      fetchConfigServers()
    ]);
    setIsLoading(false);
  }, [fetchServerStatus, fetchConfigServers]);

  // Check if configuration has been modified (dirty state)
  const isDirty = JSON.stringify(configServers) !== JSON.stringify(initialConfigServers);

  // Merge status and config data for unified view
  const mergedServerData = servers.map(statusServer => {
    const configServer = configServers.find(config => config.name === statusServer.key);
    return {
      ...statusServer,
      configData: configServer,
      enabled: configServer?.enabled ?? true
    };
  });

  // Load data on component mount
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Handle toggle enable/disable
  const handleToggleEnable = (serverId: string) => {
    setConfigServers((prevServers) =>
      prevServers.map((server) =>
        server.id === serverId ? { ...server, enabled: !server.enabled } : server
      )
    );
  };

  // Handle save configuration
  const handleSaveConfiguration = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch('/api/mcp-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(configServers),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save configuration');
      }
      toast.success('Configuration saved successfully!');
      setInitialConfigServers(JSON.parse(JSON.stringify(configServers))); // Update initial state after save
      // Optionally, re-fetch to ensure consistency
      await fetchAllData();
    } catch (e) {
      console.error('Failed to save MCP server configurations:', e);
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
      setError(errorMessage);
      toast.error(`Failed to save configurations: ${errorMessage}`);
    }
    setIsSaving(false);
  };

  // Form validation helper
  const validateServerForm = (server: MCPServerConfigFromUI, isEditing: boolean = false): string | null => {
    // Check required fields
    if (!server.name.trim()) {
      return 'Server Key Name is required';
    }

    // Check for unique name (only for new servers or when name changed)
    const existingServer = configServers.find(s => s.name === server.name.trim());
    if (!isEditing && existingServer) {
      return 'Server Key Name must be unique';
    }
    if (isEditing && existingServer && existingServer.id !== server.id) {
      return 'Server Key Name must be unique';
    }

    // Transport-specific validation
    if (server.transport.type === 'stdio') {
      const stdioTransport = server.transport as MCPTransportStdio;
      if (!stdioTransport.command?.trim()) {
        return 'Command is required for STDIO transport';
      }
    } else if (server.transport.type === 'sse' || server.transport.type === 'http') {
      const sseTransport = server.transport as MCPTransportSSE;
      if (!sseTransport.url?.trim()) {
        return 'URL is required for SSE/HTTP transport';
      }
      // Basic URL validation
      try {
        new URL(sseTransport.url);
      } catch {
        return 'Please enter a valid URL';
      }
    }

    return null; // No validation errors
  };

  // Handle add new server form submission
  const handleAddNewServer = (e: FormEvent) => {
    e.preventDefault();
    
    const validationError = validateServerForm(newServerForm);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const serverToAdd: MCPServerConfigFromUI = {
      ...newServerForm,
      id: crypto.randomUUID(),
      name: newServerForm.name.trim(),
    };

    setConfigServers(prevServers => [...prevServers, serverToAdd]);
    toast.success(`${serverToAdd.displayName || serverToAdd.name} added to the configuration. Save to persist changes.`);
    
    // Reset form and close modal
    setNewServerForm({
      id: '',
      name: '',
      displayName: '',
      enabled: true,
      transport: { type: 'stdio', command: '' },
    });
    setIsAddModalOpen(false);
  };

  // Handle edit server form submission
  const handleEditServer = (e: FormEvent) => {
    e.preventDefault();
    
    if (!editingServer) return;

    const validationError = validateServerForm(editingServer, true);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setConfigServers(prevServers =>
      prevServers.map(server =>
        server.id === editingServer.id ? { ...editingServer } : server
      )
    );

    toast.success(`${editingServer.displayName || editingServer.name} updated successfully. Save to persist changes.`);
    setIsEditModalOpen(false);
    setEditingServer(null);
  };

  if (isLoading) {
    return <p className="text-center text-muted-foreground">Loading MCP server information...</p>;
  }

  if (error) {
    return <p className="text-center text-red-500">Error: {error}</p>;
  }

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-medium">MCP Servers</h3>
          <Badge variant="outline">{mergedServerData.length} servers</Badge>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              // Reset form when opening modal
              setNewServerForm({
                id: '',
                name: '',
                displayName: '',
                enabled: true,
                transport: { type: 'stdio', command: '' },
              });
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-2 flex-1 sm:flex-none"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden xs:inline">Add New Server</span>
            <span className="xs:hidden">Add</span>
          </Button>
          <Button 
            onClick={handleSaveConfiguration}
            disabled={!isDirty || isSaving}
            size="sm"
            variant={isDirty ? "default" : "outline"}
            className="flex items-center gap-2 flex-1 sm:flex-none"
          >
            {isSaving ? 'Saving...' : isDirty ? 'Save Configuration *' : 'Save Configuration'}
          </Button>
        </div>
      </div>

      {/* Server Grid */}
      {mergedServerData.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No MCP servers configured or found.</p>
      ) : (
        <ScrollArea className="h-[300px] rounded-md border p-1 md:p-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {mergedServerData.map((server) => (
                     <HoverCard key={server.key} openDelay={200} closeDelay={100}>
            <HoverCardTrigger asChild>
              <div className="rounded-md border p-2 transition-all hover:shadow-md cursor-pointer space-y-2">
                {/* Server Header with Status and Controls */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 flex-grow min-w-0">
                    <StatusIndicator status={server.status} />
                    <div className="flex-grow min-w-0">
                      <p className="font-medium text-xs truncate" title={server.label}>{server.label}</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {server.transportType ? `${server.transportType}` : 'Unknown'}
                        {server.status === 'connected' ? ` • ${server.tools.length} tools` : ''}
                      </p>
                    </div>
                  </div>
                  {/* Toggle Switch */}
                  <div className="flex items-center space-x-1">
                    <Switch
                      checked={server.enabled}
                      onCheckedChange={() => server.configData && handleToggleEnable(server.configData.id)}
                      aria-label={`Toggle ${server.label} ${server.enabled ? 'off' : 'on'}`}
                    />
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex items-center justify-between">
                  <div className="text-[10px] text-muted-foreground">
                    {!server.enabled ? 'Disabled' : 
                     server.status === 'error' && server.errorDetails ? `Error: ${server.errorDetails.substring(0,25)}...` : 
                     server.status === 'no_tools_found' ? 'No tools found' : 
                     server.status === 'disabled' ? 'Disabled by system' : ''}
                  </div>
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost" 
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (server.configData) {
                          setEditingServer(server.configData);
                          setIsEditModalOpen(true);
                        }
                      }}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost" 
                      size="icon"
                      className="h-6 w-6 text-red-500 hover:text-red-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (server.configData) {
                          setDeletingServer(server.configData);
                          setIsDeleteModalOpen(true);
                        }
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
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
      )}

      {/* Add New Server Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New MCP Server</DialogTitle>
            <DialogDescription>
              Configure the details for the new MCP server. The Key Name must be unique.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddNewServer} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Key Name (Unique ID)</Label>
                <Input 
                  id="name" 
                  name="name" 
                  value={newServerForm.name} 
                  onChange={(e) => setNewServerForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., my-custom-mcp" 
                  required 
                />
              </div>
              <div>
                <Label htmlFor="displayName">Display Name</Label>
                <Input 
                  id="displayName" 
                  name="displayName" 
                  value={newServerForm.displayName} 
                  onChange={(e) => setNewServerForm(prev => ({ ...prev, displayName: e.target.value }))}
                  placeholder="e.g., My Custom MCP"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="transportType">Transport Type</Label>
              <Select 
                value={newServerForm.transport.type} 
                onValueChange={(value: 'stdio' | 'sse' | 'http') => {
                  setNewServerForm(prev => ({
                    ...prev,
                    transport: { type: value } as MCPTransport
                  }));
                }}
              >
                <SelectTrigger id="transportType">
                  <SelectValue placeholder="Select transport type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stdio">STDIO</SelectItem>
                  <SelectItem value="sse">SSE</SelectItem>
                  <SelectItem value="http">HTTP</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Conditional fields for STDIO */} 
            {newServerForm.transport.type === 'stdio' && (
              <>
                <div>
                  <Label htmlFor="command">Command</Label>
                  <Input 
                    id="command" 
                    name="command" 
                    value={(newServerForm.transport as MCPTransportStdio).command || ''} 
                    onChange={(e) => setNewServerForm(prev => ({
                      ...prev,
                      transport: { ...prev.transport, command: e.target.value } as MCPTransportStdio
                    }))}
                    placeholder="e.g., /path/to/executable or mcp-server-name" 
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="args">Arguments (comma-separated)</Label>
                  <Input 
                    id="args" 
                    name="args" 
                    value={((newServerForm.transport as MCPTransportStdio).args || []).join(',')} 
                    onChange={(e) => {
                      const args = e.target.value.split(',').map(arg => arg.trim()).filter(arg => arg);
                      setNewServerForm(prev => ({
                        ...prev,
                        transport: { ...prev.transport, args } as MCPTransportStdio
                      }));
                    }}
                    placeholder="arg1,arg2,arg3"
                  />
                </div>
                <div>
                  <Label htmlFor="env">Environment Variables (KEY=VALUE, one per line)</Label>
                  <Textarea 
                    id="env" 
                    name="env" 
                    value={Object.entries((newServerForm.transport as MCPTransportStdio).env || {}).map(([k,v]) => `${k}=${v}`).join('\n')} 
                    onChange={(e) => {
                      const lines = e.target.value.split('\n');
                      const envVars: Record<string, string> = {};
                      lines.forEach(line => {
                        const [key, ...valParts] = line.split('=');
                        if (key.trim()) envVars[key.trim()] = valParts.join('=');
                      });
                      setNewServerForm(prev => ({ ...prev, transport: { ...prev.transport, env: envVars } as MCPTransportStdio }));
                    }}
                    placeholder="VAR1=value1&#10;VAR2=value2" 
                  />
                </div>
                <div>
                  <Label htmlFor="cwd">Working Directory (CWD)</Label>
                  <Input 
                    id="cwd" 
                    name="cwd" 
                    value={(newServerForm.transport as MCPTransportStdio).cwd || ''} 
                    onChange={(e) => setNewServerForm(prev => ({
                      ...prev,
                      transport: { ...prev.transport, cwd: e.target.value } as MCPTransportStdio
                    }))}
                    placeholder="Optional: /path/to/working/dir"
                  />
                </div>
              </>
            )}

            {/* Conditional fields for SSE/HTTP */} 
            {(newServerForm.transport.type === 'sse' || newServerForm.transport.type === 'http') && (
              <>
                <div>
                  <Label htmlFor="url">URL</Label>
                  <Input 
                    id="url" 
                    name="url" 
                    type="url" 
                    value={(newServerForm.transport as MCPTransportSSE).url || ''} 
                    onChange={(e) => setNewServerForm(prev => ({
                      ...prev,
                      transport: { ...prev.transport, url: e.target.value } as MCPTransportSSE
                    }))}
                    placeholder="e.g., http://localhost:8000/mcp" 
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="headers">Headers (Header:Value, one per line)</Label>
                  <Textarea 
                    id="headers" 
                    name="headers" 
                    value={Object.entries((newServerForm.transport as MCPTransportSSE).headers || {}).map(([k,v]) => `${k}:${v}`).join('\n')} 
                    onChange={(e) => {
                      const lines = e.target.value.split('\n');
                      const headers: Record<string, string> = {};
                      lines.forEach(line => {
                        const [key, ...valParts] = line.split(':');
                        if (key.trim()) headers[key.trim()] = valParts.join(':').trim();
                      });
                      setNewServerForm(prev => ({ ...prev, transport: { ...prev.transport, headers: headers } as MCPTransportSSE }));
                    }}
                    placeholder="Content-Type:application/json&#10;Authorization:Bearer token"
                  />
                </div>
              </>
            )}

            <div className='flex items-center space-x-2 pt-2'>
              <Switch 
                id="enabled" 
                checked={newServerForm.enabled} 
                onCheckedChange={(checked) => setNewServerForm(prev => ({...prev, enabled: checked}))} 
              />
              <Label htmlFor="enabled">Enabled</Label>
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit">Add to List</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Server Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit MCP Server</DialogTitle>
            <DialogDescription>
              Update the configuration for {editingServer?.displayName || editingServer?.name}.
            </DialogDescription>
          </DialogHeader>
          {editingServer && (
            <form onSubmit={handleEditServer} className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-name">Key Name (Unique ID)</Label>
                  <Input 
                    id="edit-name" 
                    name="name" 
                    value={editingServer.name} 
                    onChange={(e) => setEditingServer(prev => prev ? { ...prev, name: e.target.value } : null)}
                    placeholder="e.g., my-custom-mcp" 
                    required 
                  />
                </div>
                <div>
                  <Label htmlFor="edit-displayName">Display Name</Label>
                  <Input 
                    id="edit-displayName" 
                    name="displayName" 
                    value={editingServer.displayName || ''} 
                    onChange={(e) => setEditingServer(prev => prev ? { ...prev, displayName: e.target.value } : null)}
                    placeholder="e.g., My Custom MCP"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="edit-transportType">Transport Type</Label>
                <Select 
                  value={editingServer.transport.type} 
                  onValueChange={(value: 'stdio' | 'sse' | 'http') => {
                    setEditingServer(prev => prev ? {
                      ...prev,
                      transport: { type: value } as MCPTransport
                    } : null);
                  }}
                >
                  <SelectTrigger id="edit-transportType">
                    <SelectValue placeholder="Select transport type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stdio">STDIO</SelectItem>
                    <SelectItem value="sse">SSE</SelectItem>
                    <SelectItem value="http">HTTP</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Conditional fields for STDIO */} 
              {editingServer.transport.type === 'stdio' && (
                <>
                  <div>
                    <Label htmlFor="edit-command">Command</Label>
                    <Input 
                      id="edit-command" 
                      name="command" 
                      value={(editingServer.transport as MCPTransportStdio).command || ''} 
                      onChange={(e) => setEditingServer(prev => prev ? {
                        ...prev,
                        transport: { ...prev.transport, command: e.target.value } as MCPTransportStdio
                      } : null)}
                      placeholder="e.g., /path/to/executable or mcp-server-name" 
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-args">Arguments (comma-separated)</Label>
                    <Input 
                      id="edit-args" 
                      name="args" 
                      value={((editingServer.transport as MCPTransportStdio).args || []).join(',')} 
                      onChange={(e) => {
                        const args = e.target.value.split(',').map(arg => arg.trim()).filter(arg => arg);
                        setEditingServer(prev => prev ? {
                          ...prev,
                          transport: { ...prev.transport, args } as MCPTransportStdio
                        } : null);
                      }}
                      placeholder="arg1,arg2,arg3"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-env">Environment Variables (KEY=VALUE, one per line)</Label>
                    <Textarea 
                      id="edit-env" 
                      name="env" 
                      value={Object.entries((editingServer.transport as MCPTransportStdio).env || {}).map(([k,v]) => `${k}=${v}`).join('\n')} 
                      onChange={(e) => {
                        const lines = e.target.value.split('\n');
                        const envVars: Record<string, string> = {};
                        lines.forEach(line => {
                          const [key, ...valParts] = line.split('=');
                          if (key.trim()) envVars[key.trim()] = valParts.join('=');
                        });
                        setEditingServer(prev => prev ? { ...prev, transport: { ...prev.transport, env: envVars } as MCPTransportStdio } : null);
                      }}
                      placeholder="VAR1=value1&#10;VAR2=value2" 
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-cwd">Working Directory (CWD)</Label>
                    <Input 
                      id="edit-cwd" 
                      name="cwd" 
                      value={(editingServer.transport as MCPTransportStdio).cwd || ''} 
                      onChange={(e) => setEditingServer(prev => prev ? {
                        ...prev,
                        transport: { ...prev.transport, cwd: e.target.value } as MCPTransportStdio
                      } : null)}
                      placeholder="Optional: /path/to/working/dir"
                    />
                  </div>
                </>
              )}

              {/* Conditional fields for SSE/HTTP */} 
              {(editingServer.transport.type === 'sse' || editingServer.transport.type === 'http') && (
                <>
                  <div>
                    <Label htmlFor="edit-url">URL</Label>
                    <Input 
                      id="edit-url" 
                      name="url" 
                      type="url" 
                      value={(editingServer.transport as MCPTransportSSE).url || ''} 
                      onChange={(e) => setEditingServer(prev => prev ? {
                        ...prev,
                        transport: { ...prev.transport, url: e.target.value } as MCPTransportSSE
                      } : null)}
                      placeholder="e.g., http://localhost:8000/mcp" 
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-headers">Headers (Header:Value, one per line)</Label>
                    <Textarea 
                      id="edit-headers" 
                      name="headers" 
                      value={Object.entries((editingServer.transport as MCPTransportSSE).headers || {}).map(([k,v]) => `${k}:${v}`).join('\n')} 
                      onChange={(e) => {
                        const lines = e.target.value.split('\n');
                        const headers: Record<string, string> = {};
                        lines.forEach(line => {
                          const [key, ...valParts] = line.split(':');
                          if (key.trim()) headers[key.trim()] = valParts.join(':').trim();
                        });
                        setEditingServer(prev => prev ? { ...prev, transport: { ...prev.transport, headers: headers } as MCPTransportSSE } : null);
                      }}
                      placeholder="Content-Type:application/json&#10;Authorization:Bearer token"
                    />
                  </div>
                </>
              )}

              <div className='flex items-center space-x-2 pt-2'>
                <Switch 
                  id="edit-enabled" 
                  checked={editingServer.enabled} 
                  onCheckedChange={(checked) => setEditingServer(prev => prev ? {...prev, enabled: checked} : null)} 
                />
                <Label htmlFor="edit-enabled">Enabled</Label>
              </div>

              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit">Update Server</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete MCP Server</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the server &quot;{deletingServer?.displayName || deletingServer?.name}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-start">
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button 
              type="button" 
              variant="destructive"
              onClick={() => {
                if (deletingServer) {
                  // Remove server from configServers state
                  setConfigServers(prevServers => 
                    prevServers.filter(server => server.id !== deletingServer.id)
                  );
                  toast.success(`Server "${deletingServer.displayName || deletingServer.name}" removed from configuration. Save to persist changes.`);
                  setIsDeleteModalOpen(false);
                  setDeletingServer(null);
                }
              }}
            >
              Delete Server
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
