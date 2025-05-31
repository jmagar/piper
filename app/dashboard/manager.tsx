'use client';

import React, { useState, useEffect, useCallback, ChangeEvent, FormEvent } from 'react';

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose, // Added DialogClose
} from '@/components/ui/dialog'; // Assuming path
import { Input } from '@/components/ui/input'; // Assuming path
import { Label } from '@/components/ui/label'; // Assuming path
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; // Assuming path
import { Textarea } from '@/components/ui/textarea'; // Assuming path
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
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [newServerForm, setNewServerForm] = useState<MCPServerConfigFromUI>({
    id: '', // Will be generated on submit
    name: '', // This is the keyName
    displayName: '',
    enabled: true,
    transport: { type: 'stdio', command: '' },
  });

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
    // Reset form for a new entry, generate a temporary client-side ID for react key prop if needed before proper save
    setNewServerForm({
      id: crypto.randomUUID(), // Temporary ID for form state, real one could be set on actual add to list
      name: '',
      displayName: '',
      enabled: true,
      transport: { type: 'stdio', command: '' } as MCPTransportStdio, // Type assertion
    });
    setIsAddModalOpen(true);
  };

  const handleNewServerFormChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (name.startsWith('transport.')) {
      const transportField = name.split('.')[1] as keyof MCPTransport;
      setNewServerForm(prev => ({
        ...prev,
        transport: {
          ...prev.transport,
          [transportField]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
        } as MCPTransport,
      }));
    } else {
      setNewServerForm(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
      }));
    }
  };

  const handleNewServerTransportTypeChange = (value: 'stdio' | 'sse' | 'http') => {
    setNewServerForm(prev => ({
      ...prev,
      transport: { type: value } as MCPTransport, // Reset transport specific fields when type changes
    }));
  };

  const handleAddNewServerToList = (e: FormEvent) => {
    e.preventDefault();
    // Basic validation (e.g., name is required)
    if (!newServerForm.name.trim()) {
      toast.error('Server Key Name is required.');
      return;
    }
    if (servers.some(s => s.name === newServerForm.name.trim())) {
      toast.error('Server Key Name must be unique.');
      return;
    }

    const serverToAdd: MCPServerConfigFromUI = {
      ...newServerForm,
      id: crypto.randomUUID(), // Final client-side unique ID for the list
      name: newServerForm.name.trim(), // Ensure trimmed
    };

    setServers(prevServers => [...prevServers, serverToAdd]);
    toast.success(`${serverToAdd.displayName || serverToAdd.name} added to the list. Save configuration to persist.`);
    setIsAddModalOpen(false);
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
          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">Add New Server</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Add New MCP Server</DialogTitle>
                <DialogDescription>
                  Configure the details for the new MCP server. The Key Name must be unique.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddNewServerToList} className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Key Name (Unique ID)</Label>
                    <Input id="name" name="name" value={newServerForm.name} onChange={handleNewServerFormChange} placeholder="e.g., my-custom-mcp" required />
                  </div>
                  <div>
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input id="displayName" name="displayName" value={newServerForm.displayName} onChange={handleNewServerFormChange} placeholder="e.g., My Custom MCP"/>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="transportType">Transport Type</Label>
                  <Select name="transport.type" value={newServerForm.transport.type} onValueChange={handleNewServerTransportTypeChange}>
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
                      <Input id="command" name="transport.command" value={(newServerForm.transport as MCPTransportStdio).command || ''} onChange={handleNewServerFormChange} placeholder="e.g., /path/to/executable or mcp-server-name" required/>
                    </div>
                    <div>
                      <Label htmlFor="args">Arguments (comma-separated)</Label>
                      <Input id="args" name="transport.args" value={((newServerForm.transport as MCPTransportStdio).args || []).join(',')} onChange={(e) => {
                        const transportField = e.target.name.split('.')[1] as keyof MCPTransportStdio;
                        setNewServerForm(prev => ({
                          ...prev,
                          transport: {
                            ...prev.transport,
                            [transportField]: e.target.value.split(',').map(arg => arg.trim()).filter(arg => arg),
                          } as MCPTransportStdio,
                        }));
                      }} placeholder="arg1,arg2,arg3"/>
                    </div>
                    <div>
                      <Label htmlFor="env">Environment Variables (KEY=VALUE, one per line)</Label>
                      <Textarea id="env" name="transport.env" value={Object.entries((newServerForm.transport as MCPTransportStdio).env || {}).map(([k,v]) => `${k}=${v}`).join('\n')} onChange={(e) => {
                        const lines = e.target.value.split('\n');
                        const envVars: Record<string, string> = {};
                        lines.forEach(line => {
                          const [key, ...valParts] = line.split('=');
                          if (key.trim()) envVars[key.trim()] = valParts.join('=');
                        });
                        setNewServerForm(prev => ({ ...prev, transport: { ...prev.transport, env: envVars } as MCPTransportStdio }));
                      }} placeholder="VAR1=value1\nVAR2=value2" />
                    </div>
                     <div>
                      <Label htmlFor="cwd">Working Directory (CWD)</Label>
                      <Input id="cwd" name="transport.cwd" value={(newServerForm.transport as MCPTransportStdio).cwd || ''} onChange={handleNewServerFormChange} placeholder="Optional: /path/to/working/dir"/>
                    </div>
                  </>
                )}

                {/* Conditional fields for SSE/HTTP */} 
                {(newServerForm.transport.type === 'sse' || newServerForm.transport.type === 'http') && (
                  <>
                    <div>
                      <Label htmlFor="url">URL</Label>
                      <Input id="url" name="transport.url" type="url" value={(newServerForm.transport as MCPTransportSSE).url || ''} onChange={handleNewServerFormChange} placeholder="e.g., http://localhost:8000/mcp" required/>
                    </div>
                    <div>
                      <Label htmlFor="headers">Headers (Header:Value, one per line)</Label>
                      <Textarea id="headers" name="transport.headers" value={Object.entries((newServerForm.transport as MCPTransportSSE).headers || {}).map(([k,v]) => `${k}:${v}`).join('\n')} onChange={(e) => {
                        const lines = e.target.value.split('\n');
                        const headers: Record<string, string> = {};
                        lines.forEach(line => {
                          const [key, ...valParts] = line.split(':');
                          if (key.trim()) headers[key.trim()] = valParts.join(':').trim();
                        });
                        setNewServerForm(prev => ({ ...prev, transport: { ...prev.transport, headers: headers } as MCPTransportSSE }));
                      }} placeholder="Content-Type:application/json\nAuthorization:Bearer token"/>
                    </div>
                  </>
                )}

                <div className='flex items-center space-x-2 pt-2'>
                    <Switch id="enabled" name="enabled" checked={newServerForm.enabled} onCheckedChange={(checked) => setNewServerForm(prev => ({...prev, enabled: checked}))} />
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
