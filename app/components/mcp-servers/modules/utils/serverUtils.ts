import { 
  MCPServerConfigFromUI, 
  MCPTransportSSE, 
  MCPTransportStdio, 
  MergedServerData,
  ServerFilters 
} from './serverTypes';
import { generateUUID } from '@/lib/utils/uuid';

/**
 * Format relative time from a date
 */
export const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
  return date.toLocaleDateString();
};

/**
 * Copy server configuration to clipboard
 */
export const copyServerConfig = (server: MCPServerConfigFromUI): void => {
  navigator.clipboard.writeText(JSON.stringify(server, null, 2));
};

/**
 * Create a duplicate of a server with new ID and name
 */
export const createDuplicateServer = (server: MCPServerConfigFromUI): MCPServerConfigFromUI => {
  return {
    ...server,
    id: generateUUID(),
    name: `${server.name}-copy`,
    displayName: `${server.displayName || server.name} (Copy)`
  };
};

/**
 * Get transport-specific display information
 */
export const getTransportDisplayInfo = (transport: MCPTransportSSE | MCPTransportStdio): {
  command?: string;
  url?: string;
  args?: string;
} => {
  if (transport.type === 'stdio') {
    const stdioTransport = transport as MCPTransportStdio;
    return {
      command: stdioTransport.command,
      args: stdioTransport.args?.join(' ')
    };
  } else {
    const sseTransport = transport as MCPTransportSSE;
    return {
      url: sseTransport.url
    };
  }
};

/**
 * Filter servers based on search and filter criteria
 */
export const filterServers = (
  servers: MergedServerData[], 
  filters: ServerFilters
): MergedServerData[] => {
  return servers.filter(server => {
    // Search filter
    if (filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase();
      const matchesName = server.label.toLowerCase().includes(query);
      const matchesTransport = server.transportType?.toLowerCase().includes(query);
      
      const transportInfo = server.configData ? getTransportDisplayInfo(server.configData.transport) : {};
      const matchesCommand = transportInfo.command?.toLowerCase().includes(query);
      const matchesUrl = transportInfo.url?.toLowerCase().includes(query);
      
      if (!matchesName && !matchesTransport && !matchesCommand && !matchesUrl) {
        return false;
      }
    }

    // Status filter
    if (filters.statusFilter !== 'all') {
      if (filters.statusFilter === 'connected') {
        if (server.status !== 'success') return false;
      } else if (filters.statusFilter === 'disconnected') {
        if (server.status === 'success') return false;
      } else if (server.status !== filters.statusFilter) {
        return false;
      }
    }

    // Transport filter
    if (filters.transportFilter !== 'all' && server.transportType !== filters.transportFilter) {
      return false;
    }

    // Enabled/Disabled filter
    if (filters.enabledFilter !== 'all') {
      if (filters.enabledFilter === 'enabled' && !server.enabled) return false;
      if (filters.enabledFilter === 'disabled' && server.enabled) return false;
    }

    return true;
  });
};

/**
 * Sort servers by enabled status and then alphabetically
 */
export const sortServers = (servers: MergedServerData[]): MergedServerData[] => {
  return [...servers].sort((a, b) => {
    // Sort by enabled status first (enabled servers before disabled)
    if (a.enabled !== b.enabled) {
      return b.enabled ? 1 : -1;
    }
    // Then sort alphabetically by label
    return a.label.localeCompare(b.label);
  });
};

/**
 * Check if any filters are active
 */
export const hasActiveFilters = (filters: ServerFilters): boolean => {
  return (
    filters.searchQuery.trim() !== '' ||
    filters.statusFilter !== 'all' ||
    filters.transportFilter !== 'all' ||
    filters.enabledFilter !== 'all'
  );
};

/**
 * Generate a unique server name
 */
export const generateUniqueServerName = (baseName: string, existingServers: MCPServerConfigFromUI[]): string => {
  const existingNames = existingServers.map(server => server.name);
  let counter = 1;
  let newName = baseName;
  
  while (existingNames.includes(newName)) {
    newName = `${baseName}-${counter}`;
    counter++;
  }
  
  return newName;
};

/**
 * Deep clone a server configuration
 */
export const cloneServerConfig = (server: MCPServerConfigFromUI): MCPServerConfigFromUI => {
  return JSON.parse(JSON.stringify(server));
};

/**
 * Check if two server configurations are equal (for dirty checking)
 */
export const areServerConfigsEqual = (
  config1: MCPServerConfigFromUI[], 
  config2: MCPServerConfigFromUI[]
): boolean => {
  return JSON.stringify(config1) === JSON.stringify(config2);
}; 