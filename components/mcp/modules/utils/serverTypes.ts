// Type definitions for MCP servers dashboard
import { McpServerInfo } from '@/app/api/mcp-servers/route';
import { MCPServerConfig } from '@/lib/mcp/config-watcher';

export interface MCPTransportSSE {
  type: 'sse' | 'streamable-http';
  url: string;
  headers?: Record<string, string>;
}

export interface MCPTransportStdio {
  type: 'stdio';
  command: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
}

export type MCPTransport = MCPTransportSSE | MCPTransportStdio;

// Form-specific transport types to handle env as a string for stdio
export type FormMCPTransportStdio = Omit<MCPTransportStdio, 'env'> & { env?: string };
export type FormMCPTransport = MCPTransportSSE | FormMCPTransportStdio;

export interface MCPServerConfigFromUI extends Omit<MCPServerConfig, 'id' | 'transport' | 'isEnvManaged'> {
  id: string;
  name: string;
  displayName?: string;
  transport: MCPTransport;
  enabled: boolean;
  isEnvManaged?: boolean;
}

export interface MergedServerData extends McpServerInfo {
  configData?: MCPServerConfigFromUI;
  enabled: boolean;
}

export interface ServerFilters {
  searchQuery: string;
  statusFilter: string;
  transportFilter: string;
  enabledFilter: string;
}

export interface DashboardState {
  isLoading: boolean;
  error: string | null;
  isClient: boolean;
  lastUpdated: Date | null;
  isRefreshing: boolean;
  autoRefresh: boolean;
}

export interface ModalState {
  isAddModalOpen: boolean;
  isEditModalOpen: boolean;
  isDeleteModalOpen: boolean;
  editingServer: MCPServerConfigFromUI | null;
  deletingServer: MCPServerConfigFromUI | null;
}

export interface ServerFormData extends Omit<MCPServerConfigFromUI, 'id' | 'isEnvManaged' | 'transport' > {
  id: string;
  name: string;
  displayName: string;
  enabled: boolean;
  transport: FormMCPTransport;
}

export const DEFAULT_SERVER_FORM: ServerFormData = {
  id: '',
  name: '',
  displayName: '',
  enabled: true,
  transport: { type: 'stdio', command: '' },
  retries: 3,
};

export const DEFAULT_FILTERS: ServerFilters = {
  searchQuery: '',
  statusFilter: 'all',
  transportFilter: 'all',
  enabledFilter: 'all',
};

export type ServerAction = 
  | 'copy'
  | 'duplicate'
  | 'test'
  | 'edit'
  | 'delete'
  | 'toggle'; 