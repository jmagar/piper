import { useCallback } from 'react';
import { MCPServerConfigFromUI, ServerAction } from '../utils/serverTypes';
import { copyServerConfig, createDuplicateServer } from '../utils/serverUtils';
import { toast } from '@/components/ui/toast';

export interface ServerActionResponse<T = any> {
  success: boolean;
  error?: string;
  data?: T;
}

export interface UseServerActionsReturn {
  handleServerAction: (action: ServerAction, server: MCPServerConfigFromUI) => void;
  copyServerConfiguration: (server: MCPServerConfigFromUI) => void;
  duplicateServer: (server: MCPServerConfigFromUI, onDuplicate: (server: MCPServerConfigFromUI) => void) => void;
  testConnection: (server: MCPServerConfigFromUI) => Promise<ServerActionResponse>;
  addServer: (server: MCPServerConfigFromUI) => Promise<ServerActionResponse<MCPServerConfigFromUI>>;
  updateServer: (server: MCPServerConfigFromUI) => Promise<ServerActionResponse<MCPServerConfigFromUI>>;
  deleteServer: (serverId: string) => Promise<ServerActionResponse<{ id: string }>>;
}

/**
 * Custom hook for managing server actions
 */
export const useServerActions = (): UseServerActionsReturn => {
  const copyServerConfiguration = useCallback((server: MCPServerConfigFromUI) => {
    try {
      copyServerConfig(server);
      toast({ 
        title: 'Server configuration copied to clipboard', 
        status: 'success' 
      });
    } catch {
      toast({ 
        title: 'Failed to copy configuration', 
        description: 'Could not access clipboard',
        status: 'error' 
      });
    }
  }, []);

  const duplicateServer = useCallback((
    server: MCPServerConfigFromUI, 
    onDuplicate: (server: MCPServerConfigFromUI) => void
  ) => {
    try {
      const duplicate = createDuplicateServer(server);
      onDuplicate(duplicate);
      toast({ 
        title: 'Server duplicated successfully', 
        description: `Created "${duplicate.displayName || duplicate.name}"`,
        status: 'success' 
      });
    } catch {
      toast({ 
        title: 'Failed to duplicate server', 
        description: 'An error occurred while duplicating the server',
        status: 'error' 
      });
    }
  }, []);

  const testConnection = useCallback(async (server: MCPServerConfigFromUI): Promise<ServerActionResponse> => {
    toast({ 
      title: `Testing connection to ${server.displayName || server.name}...`, 
      status: 'info' 
    });

    try {
      const response = await fetch('/api/mcp/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(server),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Test connection failed');
      }

      const result = await response.json();
      toast({ 
        title: `Connection test successful for ${server.displayName || server.name}`, 
        description: result.message || 'Connection appears to be working',
        status: 'success' 
      });
      return { success: true, data: result };
    } catch (error: any) {
      const errorMessage = error?.message || (error instanceof Error ? error.message : 'Unknown error occurred during connection test.');
      toast({ 
        title: `Connection test failed for ${server.displayName || server.name}`, 
        description: errorMessage,
        status: 'error' 
      });
      return { success: false, error: errorMessage };
    }
  }, []);

  const handleServerAction = useCallback((action: ServerAction, server: MCPServerConfigFromUI) => {
    switch (action) {
      case 'copy':
        copyServerConfiguration(server);
        break;
      case 'test':
        testConnection(server);
        break;
      // Note: 'duplicate', 'edit', 'delete', and 'toggle' are handled by parent components
      // as they require additional context like state setters and modal handlers
      default:
        console.warn(`Unhandled server action: ${action}`);
    }
  }, [copyServerConfiguration, testConnection]);

  const addServer = useCallback(async (server: MCPServerConfigFromUI): Promise<ServerActionResponse<MCPServerConfigFromUI>> => {
    toast({ title: 'Adding server...', description: `Attempting to add ${server.displayName || server.name}.`, status: 'info' });
    try {
      const response = await fetch('/api/mcp/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(server),
      });
      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData.message || responseData.error || `Failed to add server (HTTP ${response.status})`);
      }
      toast({ title: 'Server Added Successfully', description: `${responseData.displayName || responseData.name} has been added.`, status: 'success' });
      return { success: true, data: responseData };
    } catch (error: any) {
      const errorMessage = error?.message || (error instanceof Error ? error.message : 'An unknown error occurred.');
      toast({ title: 'Failed to Add Server', description: errorMessage, status: 'error' });
      return { success: false, error: errorMessage };
    }
  }, []);

  const updateServer = useCallback(async (server: MCPServerConfigFromUI): Promise<ServerActionResponse<MCPServerConfigFromUI>> => {
    toast({ title: 'Updating server...', description: `Attempting to update ${server.displayName || server.name}.`, status: 'info' });
    try {
      const response = await fetch(`/api/mcp/config?id=${server.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(server),
      });
      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData.message || responseData.error || `Failed to update server (HTTP ${response.status})`);
      }
      toast({ title: 'Server Updated Successfully', description: `${responseData.displayName || responseData.name} has been updated.`, status: 'success' });
      return { success: true, data: responseData };
    } catch (error: any) {
      const errorMessage = error?.message || (error instanceof Error ? error.message : 'An unknown error occurred.');
      toast({ title: 'Failed to Update Server', description: errorMessage, status: 'error' });
      return { success: false, error: errorMessage };
    }
  }, []);

  const deleteServer = useCallback(async (serverId: string): Promise<ServerActionResponse<{ id: string }>> => {
    toast({ title: 'Deleting server...', description: `Attempting to delete server ID: ${serverId}.`, status: 'info' });
    try {
      const response = await fetch(`/api/mcp/config?id=${serverId}`, {
        method: 'DELETE',
      });
      // DELETE might return 204 No Content or a JSON body with the ID
      let responseData;
      if (response.status !== 204) {
         responseData = await response.json();
      }
      if (!response.ok) {
        throw new Error(responseData?.message || responseData?.error || `Failed to delete server (HTTP ${response.status})`);
      }
      toast({ title: 'Server Deleted Successfully', description: `Server ID: ${serverId} has been deleted.`, status: 'success' });
      return { success: true, data: { id: serverId } }; // Return the ID for confirmation
    } catch (error: any) {
      const errorMessage = error?.message || (error instanceof Error ? error.message : 'An unknown error occurred.');
      toast({ title: 'Failed to Delete Server', description: errorMessage, status: 'error' });
      return { success: false, error: errorMessage };
    }
  }, []);

  return {
    handleServerAction,
    copyServerConfiguration,
    duplicateServer,
    testConnection,
    addServer,
    updateServer,
    deleteServer,
  };
}; 