import { useState, useCallback, useEffect } from 'react';
import { MCPServerConfigFromUI } from '../utils/serverTypes';
import { areServerConfigsEqual, cloneServerConfig } from '../utils/serverUtils';
import { toast } from '@/components/ui/toast';

export interface UseServerConfigReturn {
  configServers: MCPServerConfigFromUI[];
  initialConfigServers: MCPServerConfigFromUI[];
  isSaving: boolean;
  isDirty: boolean;
  error: string | null;
  fetchConfigServers: () => Promise<void>;
  saveConfiguration: () => Promise<void>;
  addServer: (server: MCPServerConfigFromUI) => void;
  updateServer: (serverId: string, updates: Partial<MCPServerConfigFromUI>) => void;
  removeServer: (serverId: string) => void;
  toggleServerEnabled: (serverId: string) => void;
  resetToInitial: () => void;
  clearError: () => void;
}

/**
 * Custom hook for managing server configuration operations
 */
export const useServerConfig = (): UseServerConfigReturn => {
  const [configServers, setConfigServers] = useState<MCPServerConfigFromUI[]>([]);
  const [initialConfigServers, setInitialConfigServers] = useState<MCPServerConfigFromUI[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDirty = !areServerConfigsEqual(configServers, initialConfigServers);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

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
      toast({ title: 'Failed to load configurations', description: errorMessage, status: 'error' });
    }
  }, []);

  const saveConfiguration = useCallback(async () => {
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
      toast({ title: 'Configuration saved successfully!', status: 'success' });
      setInitialConfigServers(JSON.parse(JSON.stringify(configServers))); // Update initial state after save
    } catch (e) {
      console.error('Failed to save MCP server configurations:', e);
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
      setError(errorMessage);
      toast({ title: 'Failed to save configurations', description: errorMessage, status: 'error' });
    } finally {
      setIsSaving(false);
    }
  }, [configServers]);

  const addServer = useCallback((server: MCPServerConfigFromUI) => {
    setConfigServers(prevServers => [...prevServers, server]);
  }, []);

  const updateServer = useCallback((serverId: string, updates: Partial<MCPServerConfigFromUI>) => {
    setConfigServers(prevServers =>
      prevServers.map(server =>
        server.id === serverId ? { ...server, ...updates } : server
      )
    );
  }, []);

  const removeServer = useCallback((serverId: string) => {
    setConfigServers(prevServers => 
      prevServers.filter(server => server.id !== serverId)
    );
  }, []);

  const toggleServerEnabled = useCallback((serverId: string) => {
    setConfigServers(prevServers =>
      prevServers.map(server =>
        server.id === serverId ? { ...server, enabled: !server.enabled } : server
      )
    );
  }, []);

  const resetToInitial = useCallback(() => {
    setConfigServers(initialConfigServers.map(server => cloneServerConfig(server)));
  }, [initialConfigServers]);

  // Initial load
  useEffect(() => {
    fetchConfigServers();
  }, [fetchConfigServers]);

  return {
    configServers,
    initialConfigServers,
    isSaving,
    isDirty,
    error,
    fetchConfigServers,
    saveConfiguration,
    addServer,
    updateServer,
    removeServer,
    toggleServerEnabled,
    resetToInitial,
    clearError,
  };
}; 