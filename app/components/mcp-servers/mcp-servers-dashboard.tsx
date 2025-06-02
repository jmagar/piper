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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

// Icons
import { 
  AlertCircle, 
  CheckCircle2, 
  HelpCircle, 
  XCircle, 
  Plus, 
  Pencil, 
  Trash2, 
  Settings,
  RefreshCw,
  Search,
  Filter,
  MoreVertical,
  Copy,
  TestTube,
  Files,
  Clock,
  Eye,
  EyeOff
} from 'lucide-react';
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
  const [isClient, setIsClient] = useState(false);

  // New configuration management state
  const [configServers, setConfigServers] = useState<MCPServerConfigFromUI[]>([]);
  const [initialConfigServers, setInitialConfigServers] = useState<MCPServerConfigFromUI[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Enhanced dashboard state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [transportFilter, setTransportFilter] = useState<string>('all');
  const [enabledFilter, setEnabledFilter] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

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

  // Enhanced fetch with refresh state
  const fetchAllData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    if (!showRefreshing) setIsLoading(true);
    
    try {
      await Promise.all([
        fetchServerStatus(),
        fetchConfigServers()
      ]);
      setLastUpdated(new Date());
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [fetchServerStatus, fetchConfigServers]);

  // Manual refresh function
  const handleManualRefresh = useCallback(() => {
    fetchAllData(true);
  }, [fetchAllData]);

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

  // Filter and search logic
  const filteredServerData = mergedServerData.filter(server => {
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchesName = server.label.toLowerCase().includes(query);
      const matchesTransport = server.transportType?.toLowerCase().includes(query);
      const matchesCommand = server.configData?.transport.type === 'stdio' && 
        (server.configData.transport as MCPTransportStdio).command?.toLowerCase().includes(query);
      const matchesUrl = (server.configData?.transport.type === 'sse' || server.configData?.transport.type === 'http') && 
        (server.configData.transport as MCPTransportSSE).url?.toLowerCase().includes(query);
      
      if (!matchesName && !matchesTransport && !matchesCommand && !matchesUrl) {
        return false;
      }
    }

    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'disconnected') {
        // Consider servers as disconnected if they're not connected, regardless of specific status
        if (server.status === 'connected') {
          return false;
        }
      } else if (server.status !== statusFilter) {
        return false;
      }
    }

    // Transport filter
    if (transportFilter !== 'all' && server.transportType !== transportFilter) {
      return false;
    }

    // Enabled/Disabled filter
    if (enabledFilter !== 'all') {
      if (enabledFilter === 'enabled' && !server.enabled) {
        return false;
      }
      if (enabledFilter === 'disabled' && server.enabled) {
        return false;
      }
    }

    return true;
  }).sort((a, b) => {
    // Sort by enabled status first (enabled servers before disabled)
    if (a.enabled !== b.enabled) {
      return b.enabled ? 1 : -1;
    }
    // Then sort alphabetically by label
    return a.label.localeCompare(b.label);
  });

  // Helper functions
  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const copyServerConfig = (server: MCPServerConfigFromUI) => {
    navigator.clipboard.writeText(JSON.stringify(server, null, 2));
    toast.success('Server configuration copied to clipboard');
  };

  const duplicateServer = (server: MCPServerConfigFromUI) => {
    const duplicate = {
      ...server,
      id: crypto.randomUUID(),
      name: `${server.name}-copy`,
      displayName: `${server.displayName || server.name} (Copy)`
    };
    setConfigServers(prev => [...prev, duplicate]);
    toast.success('Server duplicated successfully');
  };

  const testConnection = async (server: MCPServerConfigFromUI) => {
    toast.info('Testing connection...', { id: `test-${server.id}` });
    // Simulate test - in real implementation, this would call an API
    setTimeout(() => {
      toast.success('Connection test completed', { id: `test-${server.id}` });
    }, 2000);
  };

  // Load data on component mount
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Set client-side flag to prevent hydration mismatch
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Auto-refresh logic
  useEffect(() => {
    if (!autoRefresh || !isClient) return;
    
    const interval = setInterval(() => {
      fetchAllData(true);
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, isClient, fetchAllData]);

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
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-semibold text-foreground">MCP Servers</h3>
            <Badge variant="secondary" className="bg-muted text-muted-foreground font-medium">
              {mergedServerData.filter(server => server.enabled).length} of {mergedServerData.length} servers
            </Badge>
            {lastUpdated && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {formatRelativeTime(lastUpdated)}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className={cn(
                "flex items-center gap-2",
                isRefreshing && "animate-spin"
              )}
            >
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={cn(
                "flex items-center gap-2",
                autoRefresh ? "bg-green-50 text-green-700 border-green-200" : ""
              )}
            >
              {autoRefresh ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              <span className="hidden sm:inline">Auto</span>
            </Button>
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
              className="flex items-center gap-2 hover:bg-accent transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden xs:inline">Add</span>
            </Button>
            <Button 
              onClick={handleSaveConfiguration}
              disabled={!isDirty || isSaving}
              size="sm"
              variant={isDirty ? "default" : "outline"}
              className={cn(
                "flex items-center gap-2 transition-all",
                isDirty && "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              {isSaving ? 'Saving...' : 'Save'}
              {isDirty && <span className="text-xs opacity-75">*</span>}
            </Button>
          </div>
        </div>

        {/* Search and Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search servers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="connected">Connected</SelectItem>
                <SelectItem value="disconnected">Disconnected</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="no_tools_found">No Tools</SelectItem>
              </SelectContent>
            </Select>
            <Select value={transportFilter} onValueChange={setTransportFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Transport" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="stdio">STDIO</SelectItem>
                <SelectItem value="sse">SSE</SelectItem>
                <SelectItem value="http">HTTP</SelectItem>
              </SelectContent>
            </Select>
            <Select value={enabledFilter} onValueChange={setEnabledFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Enabled" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Servers</SelectItem>
                <SelectItem value="enabled">Enabled</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
              </SelectContent>
            </Select>
            {(searchQuery || statusFilter !== 'all' || transportFilter !== 'all' || enabledFilter !== 'all') && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setTransportFilter('all');
                  setEnabledFilter('all');
                }}
                className="px-3"
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Server Grid */}
      {!isClient ? (
        <div className="text-center py-12">
          <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
            <Settings className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-sm">Loading MCP servers...</p>
        </div>
      ) : filteredServerData.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
            <Settings className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-sm">
            {mergedServerData.length === 0 
              ? 'No MCP servers configured or found.' 
              : 'No servers match your search criteria.'
            }
          </p>
          <p className="text-muted-foreground text-xs mt-1">
            {mergedServerData.length === 0 
              ? 'Add a server to get started.' 
              : 'Try adjusting your search or filters.'
            }
          </p>
        </div>
      ) : (
        <ScrollArea className="h-[400px] w-full">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 p-1">
            {filteredServerData.map((server) => (
              <HoverCard key={server.key} openDelay={300} closeDelay={100}>
                <HoverCardTrigger asChild>
                  <div className={cn(
                    "group relative rounded-lg border bg-card p-4 transition-all duration-200 cursor-pointer",
                    "hover:shadow-md hover:shadow-border/10 hover:-translate-y-0.5",
                    "border-border/50 hover:border-border",
                    !server.enabled && "opacity-60"
                  )}>
                    {/* Server Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <StatusIndicator status={server.status} className="shrink-0" />
                        <div className="min-w-0 flex-1">
                          <h4 className="font-medium text-sm text-foreground truncate" title={server.label}>
                            {server.label}
                          </h4>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {server.transportType || 'Unknown transport'}
                          </p>
                          {server.configData && (
                            <>
                              <p className="text-[10px] text-muted-foreground/80 truncate mt-0.5" title={
                                server.configData.transport.type === 'stdio' 
                                  ? (server.configData.transport as MCPTransportStdio).command
                                  : server.configData.transport.type === 'sse' || server.configData.transport.type === 'http'
                                  ? (server.configData.transport as MCPTransportSSE).url
                                  : ''
                              }>
                                {server.configData.transport.type === 'stdio' && (
                                  <span>cmd: {(server.configData.transport as MCPTransportStdio).command}</span>
                                )}
                                {(server.configData.transport.type === 'sse' || server.configData.transport.type === 'http') && (
                                  <span>url: {(server.configData.transport as MCPTransportSSE).url}</span>
                                )}
                              </p>
                              {server.configData.transport.type === 'stdio' && (server.configData.transport as MCPTransportStdio).args && (server.configData.transport as MCPTransportStdio).args!.length > 0 && (
                                <p className="text-[10px] text-muted-foreground/60 truncate mt-0.5" title={(server.configData.transport as MCPTransportStdio).args!.join(' ')}>
                                  args: {(server.configData.transport as MCPTransportStdio).args!.join(' ')}
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      <Switch
                        checked={server.enabled}
                        onCheckedChange={() => server.configData && handleToggleEnable(server.configData.id)}
                        aria-label={`Toggle ${server.label} ${server.enabled ? 'off' : 'on'}`}
                        className="shrink-0"
                      />
                    </div>
                    
                    {/* Status Info */}
                    <div className="mb-3">
                      {server.status === 'connected' ? (
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="text-xs border-green-200 text-green-700 bg-green-50">
                            {server.tools.length} tools
                          </Badge>
                        </div>
                      ) : server.status === 'error' ? (
                        <Badge variant="outline" className="text-xs border-red-200 text-red-700 bg-red-50">
                          Error
                        </Badge>
                      ) : server.status === 'no_tools_found' ? (
                        <Badge variant="outline" className="text-xs border-yellow-200 text-yellow-700 bg-yellow-50">
                          No tools
                        </Badge>
                      ) : !server.enabled ? (
                        <Badge variant="outline" className="text-xs border-gray-200 text-gray-600 bg-gray-50">
                          Disabled
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          Unknown
                        </Badge>
                      )}
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-1">
                      {server.configData && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost" 
                              size="icon"
                              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-accent"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => testConnection(server.configData!)}>
                              <TestTube className="h-4 w-4 mr-2" />
                              Test Connection
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => copyServerConfig(server.configData!)}>
                              <Copy className="h-4 w-4 mr-2" />
                              Copy Configuration
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => duplicateServer(server.configData!)}>
                              <Files className="h-4 w-4 mr-2" />
                              Duplicate Server
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => {
                                setEditingServer(server.configData!);
                                setIsEditModalOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit Server
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => {
                                setDeletingServer(server.configData!);
                                setIsDeleteModalOpen(true);
                              }}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Server
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                </HoverCardTrigger>
                <HoverCardContent className="w-80 max-h-64 overflow-y-auto" side="top" align="start">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <StatusIndicator status={server.status} />
                      <h4 className="font-semibold text-sm">{server.label}</h4>
                    </div>
                    
                    {server.status === 'error' && server.errorDetails && (
                      <div className="p-2 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-xs text-red-700 font-medium">Error Details:</p>
                        <p className="text-xs text-red-600 mt-1">{server.errorDetails}</p>
                      </div>
                    )}
                    
                    {server.tools.length > 0 ? (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">Available Tools:</p>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {server.tools.map((tool) => (
                            <div key={tool.name} className="p-2 bg-muted rounded-md">
                              <p className="font-medium text-xs text-foreground">{tool.name}</p>
                              {tool.description && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                  {tool.description}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        {server.status === 'error' ? 'Cannot load tools due to connection error.' : 
                         server.status === 'no_tools_found' ? 'Server connected but no tools available.' :
                         'No tools available or server not connected.'}
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
