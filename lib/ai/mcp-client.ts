import * as fs from 'fs';
import { Writable } from 'stream';
import { experimental_createMCPClient } from 'ai'; // Removed LocalMCPToolSchema, MCPToolCallMessage, MCPToolResponseMessage as they are not found/needed for current compilation
import { Experimental_StdioMCPTransport } from 'ai/mcp-stdio'; // <-- Import from here
import { fileURLToPath } from 'url';
import { dirname, join as pathJoin } from 'path';

/**
 * Defines a local, more specific schema for MCP tools if needed.
 * For now, it can be equivalent to MCPToolSchema or a subset.
 */
export type LocalMCPToolSchema = {
  // Define properties based on expected schema structure, e.g.:
  // description?: string;
  // parameters?: object; // or a more specific Zod-like schema type if known
  [key: string]: unknown; // Allow any other properties for flexibility
};

/**
 * Defines the structure for transport configuration within a server entry.
 */
export type MCPTransportConfig =
  | { type: 'stdio'; command: string; args?: string[]; env?: Record<string, string>; cwd?: string; stderr?: Writable; }
  | { type: 'sse'; url: string; headers?: Record<string, string> }
  | { type: 'custom'; send: (message: unknown) => void; registerHandler: (handler: (message: unknown) => void) => void };

// Define specific transport config types for assertions
export type StdioTransportConfig = {
  type: 'stdio';
  command: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  stderr?: Writable;
};
export type SseTransportConfig = { type: 'sse'; url: string; headers?: Record<string, string> };
// CustomTransportConfig could be defined if needed for other uses:
// export type CustomTransportConfig = { type: 'custom'; send: (message: unknown) => void; registerHandler: (handler: (message: unknown) => void) => void };

/**
 * Defines the structure for a server configuration entry in config.json.
 */
export interface ServerConfigEntry {
  label?: string; // Made optional - will use server key as fallback for display
  name?: string; // Client name for experimental_createMCPClient
  transport: MCPTransportConfig;
  schemas?: Record<string, LocalMCPToolSchema>;
  // Fallback properties for transport inference, mainly used in example main()
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string; // Added for potential fallback if config has top-level cwd
  url?: string;
  headers?: Record<string, string>;
  // stderr is a stream, unlikely to be a simple JSON config value at top level for fallback.
}

/**
 * Main application configuration structure, as loaded from config.json.
 */
export interface AppConfig {
  mcpServers: Record<string, ServerConfigEntry>; 
}

/**
 * MCPService manages the lifecycle and interaction with an MCP client.
 */
export class MCPService {
  private mcpClient: Awaited<ReturnType<typeof experimental_createMCPClient>> | null = null;
  private config: ServerConfigEntry;
  private isInitialized = false;
  private displayName: string; // For logging

  constructor(config: ServerConfigEntry, serverKey: string) { 
    this.config = config;
    this.displayName = config.label || serverKey; 
  }

  /**
   * Initializes the MCP client.
   * This method should be called before attempting to get tools.
   */
  async initialize(): Promise<void> {
    if (this.isInitialized && this.mcpClient) {
      console.log(`MCP client for ${this.displayName} is already initialized.`);
      return;
    }

    try {
      console.log(`Initializing MCP client for ${this.displayName} with transport config:`, this.config.transport);

      let transportForClient: Experimental_StdioMCPTransport | { type: 'sse'; url: string; headers?: Record<string, string> };

      // Assign transport based on type
      if (this.config.transport.type === 'sse') {
        const sseConfig = this.config.transport; // TS infers SseTransportConfig due to discriminated union
        transportForClient = {
          type: 'sse',
          url: sseConfig.url,
        };
        if (sseConfig.headers) {
          // Type assertion to SseTransportConfig or access via narrowed transportForClient
          (transportForClient as SseTransportConfig).headers = sseConfig.headers;
        }
      } else if (this.config.transport.type === 'stdio') {
        const stdioConfig = this.config.transport; // TS infers StdioTransportConfig
        transportForClient = new Experimental_StdioMCPTransport({
          command: stdioConfig.command,
          args: stdioConfig.args,
          env: stdioConfig.env,
          cwd: stdioConfig.cwd,
          stderr: stdioConfig.stderr,
        });
      } else if (this.config.transport.type === 'custom') {
        // Explicitly handle 'custom' as unsupported for experimental_createMCPClient
        throw new Error(`'custom' transport type for server '${this.displayName}' is not supported by experimental_createMCPClient. Please use 'sse' or 'stdio'.`);
      } else {
        // This block handles cases where `this.config.transport.type` is not 'sse', 'stdio', or 'custom'.
        const transport: unknown = this.config.transport;
        let transportTypeString = 'unknown';
        if (transport && typeof (transport as { type?: unknown }).type === 'string') {
            transportTypeString = (transport as { type: string }).type;
        }
        const transportDetails = JSON.stringify(transport);
        console.error(`Unsupported or misconfigured transport type ('${transportTypeString}') for server '${this.displayName}'. Expected 'sse' or 'stdio'. Details: ${transportDetails}`);
        throw new Error(`Unsupported or misconfigured transport type ('${transportTypeString}') for server '${this.displayName}'. Expected 'sse' or 'stdio'.`);
      }
      
      const clientOptions: {
        name?: string;
        transport: Experimental_StdioMCPTransport | { type: 'sse'; url: string; headers?: Record<string, string> };
      } = {
        transport: transportForClient,
      };

      if (this.config.name) {
        clientOptions.name = this.config.name;
      }

      console.log(`[${this.displayName}] Calling experimental_createMCPClient with options:`, {
        name: clientOptions.name,
        transportType: this.config.transport?.type, 
        transportDetails: this.config.transport?.type === 'stdio' 
          ? 'Instance of Experimental_StdioMCPTransport'
          : clientOptions.transport 
      });

      this.mcpClient = await experimental_createMCPClient(clientOptions);
      this.isInitialized = true;
      console.log(`MCP client for ${this.displayName} initialized successfully.`);
    } catch (error) {
      console.error(`Failed to initialize MCP client for ${this.displayName}:`, error);
      this.isInitialized = false;
      throw error;
    }
  }

  /**
   * Retrieves tools from the MCP client.
   * If schemas were provided in the config, they are used for explicit schema definition.
   * Otherwise, it performs schema discovery.
   * 
   * @returns A promise that resolves to an object map of MCPToolDefinition.
   * @throws Error if the client is not initialized.
   */
  async getTools<T extends Record<string, LocalMCPToolSchema> = Record<string, LocalMCPToolSchema>>(): Promise<Record<string, { name?: string; description?: string; schema?: T[keyof T]; }>> {
    if (!this.mcpClient || !this.isInitialized) {
      throw new Error('MCP client is not initialized. Call initialize() first.');
    }

    try {
      if (this.config.schemas) {
        console.log('Fetching tools with explicit schemas.');
        // Assuming mcpClient.tools returns an object map of tools
        return this.mcpClient.tools(this.config.schemas as T) as unknown as Record<string, { name?: string; description?: string; schema?: T[keyof T]; }>;
      } else {
        console.log('Fetching tools with schema discovery.');
        // Assuming mcpClient.tools returns an object map of tools
        return this.mcpClient.tools() as unknown as Record<string, { name?: string; description?: string; schema?: T[keyof T]; }>;
      }
    } catch (error) {
      console.error('Failed to fetch tools:', error);
      throw error;
    }
  }
}

/**
 * Loads application configuration from config.json.
 * Assumes config.json is in the project root, two levels up from this file's directory (lib/ai/).
 */
export function getAppConfig(): AppConfig {
  const __filename = fileURLToPath(import.meta.url);
  const currentDir = dirname(__filename);
  // Path relative to this file: ../../config.json to reach project root
  // Adjusted path for compiled output in dist_test, assuming dist_test is one level below project root
  // This will make configPath resolve to project_root/config.json when run from dist_test/
  const configPath = pathJoin(currentDir, '..', 'config.json'); 
  console.log(`Attempting to load config from: ${configPath}`); // Logging path
  try {
    const rawConfig = fs.readFileSync(configPath, 'utf-8');
    const parsedConfig = JSON.parse(rawConfig);
    console.log('Loaded configuration from config.json:', JSON.stringify(parsedConfig, null, 2)); // Log the entire parsed config
    if (!parsedConfig.mcpServers) {
      console.error('config.json is missing the mcpServers property.');
      return { mcpServers: {} };
    }
    return parsedConfig;
  } catch (error) {
    console.error(`Failed to load or parse config.json from ${configPath}:`, error);
    return { mcpServers: {} }; // Return a default structure on error
  }
}

// Example usage (uncomment to run):

async function main() {
  try { // Main try block for the entire function
    const appConfig = getAppConfig();
    console.log('[main] Loaded appConfig:', JSON.stringify(appConfig, null, 2));

    if (!appConfig || !appConfig.mcpServers || typeof appConfig.mcpServers !== 'object') { 
      console.error('Error: mcpServers configuration is missing or invalid in config.json.'); 
      return;
    }

    const serverNames = Object.keys(appConfig.mcpServers); 
    if (serverNames.length === 0) {
      console.log('No servers configured in config.json.');
      return;
    }

    for (const serverName of serverNames) {
      console.log(`\n--- Testing server: ${serverName} ---`);
      const serverConfigEntry = appConfig.mcpServers[serverName] as ServerConfigEntry; 

      console.log(`[main] Original serverConfigEntry for '${serverName}':`, JSON.stringify(serverConfigEntry, null, 2));

      if (!serverConfigEntry.transport || typeof serverConfigEntry.transport !== 'object') {
        console.warn(`[main] 'transport' object missing or not an object for server '${serverName}'. Initializing from top-level properties.`);
        serverConfigEntry.transport = {} as MCPTransportConfig;
      }

      if (!serverConfigEntry.transport.type) {
        // Ensure transport is an object before assigning to its 'type' property
        if (typeof serverConfigEntry.transport !== 'object' || serverConfigEntry.transport === null) {
          serverConfigEntry.transport = {} as MCPTransportConfig; // Initialize if not a proper object
        }
        if (typeof serverConfigEntry.command === 'string') {
          (serverConfigEntry.transport as { type?: string }).type = 'stdio';
          console.log(`[main] Inferred transport type 'stdio' for server '${serverName}'.`);
        } else if (typeof serverConfigEntry.url === 'string') {
          (serverConfigEntry.transport as { type?: string }).type = 'sse';
          console.log(`[main] Inferred transport type 'sse' for server '${serverName}'.`);
        } else {
          console.warn(`[main] Could not infer transport type for server '${serverName}'. It might be missing 'command' or 'url' at top-level, or they are not strings.`);
        }
      }

      if (serverConfigEntry.transport.type === 'stdio') {
        const stdioTransport = serverConfigEntry.transport as StdioTransportConfig;
        // Infer from top-level if not present in transport object
        if (serverConfigEntry.command !== undefined) {
          stdioTransport.command = stdioTransport.command || serverConfigEntry.command;
        } else if (stdioTransport.command === undefined) {
          // If serverConfigEntry.command is undefined AND stdioTransport.command was also undefined,
          // command is mandatory for stdio, so this indicates a config issue.
          console.error(`[main] Critical: 'command' is undefined for stdio server '${serverName}' in both transport object and top-level config.`);
          // Potentially throw an error here or ensure command has a default or is checked before client creation
        }
        // For optional properties, only assign if serverConfigEntry has them
        if (serverConfigEntry.args !== undefined) {
          stdioTransport.args = stdioTransport.args || serverConfigEntry.args;
        }
        if (serverConfigEntry.env !== undefined) {
          stdioTransport.env = stdioTransport.env || serverConfigEntry.env;
        }
        if (serverConfigEntry.cwd !== undefined) {
          stdioTransport.cwd = stdioTransport.cwd || serverConfigEntry.cwd; // Added cwd inference
        }

        // If 'url' was part of an old StdioTransportConfig and present from a legacy config.json, handle/warn
        if ('url' in serverConfigEntry.transport && serverConfigEntry.transport.url !== undefined) {
          console.warn(`[main] 'url' property found in stdio transport configuration for server '${serverName}'. It is not applicable to StdioMCPTransport and will be ignored.`);
        }
      } else if (serverConfigEntry.transport.type === 'sse') {
        const sseTransport = serverConfigEntry.transport as SseTransportConfig;
        sseTransport.url = serverConfigEntry.url || sseTransport.url;
        sseTransport.headers = serverConfigEntry.headers || sseTransport.headers;
      }

      console.log(`[main] Normalized serverConfigEntry for '${serverName}':`, JSON.stringify(serverConfigEntry, null, 2));

      if (!serverConfigEntry.transport || typeof serverConfigEntry.transport !== 'object') {
        console.error(`Error testing server ${serverName}: Critical error: 'transport' configuration is still missing or invalid after normalization for server '${serverName}'.`);
        continue;
      }

      const transportType = serverConfigEntry.transport.type;
      if (typeof transportType !== 'string' || !['stdio', 'sse', 'custom'].includes(transportType)) {
        console.error(
          `Error testing server ${serverName}: Invalid transport type for server '${serverName}'. ` +
          `Expected 'stdio', 'sse', or 'custom', got: ${JSON.stringify(transportType)}`
        );
        continue;
      }

      if (transportType === 'stdio') {
        if (!(serverConfigEntry.transport as StdioTransportConfig).command) {
          console.error(`Error testing server ${serverName}: 'command' is missing for stdio transport in server '${serverName}'.`);
          continue;
        }
      } else if (transportType === 'sse') {
        if (!(serverConfigEntry.transport as SseTransportConfig).url) {
          console.error(`Error testing server ${serverName}: 'url' is missing for sse transport in server '${serverName}'.`);
          continue;
        }
      }

      try { // Inner try for individual server processing
        const mcpService = new MCPService(serverConfigEntry, serverName); // Pass serverName as key
        console.log(`Initializing service for ${serverName}...`);
        await mcpService.initialize();
        console.log(`Service for ${serverName} initialized.`);
        console.log(`Fetching tools for ${serverName}...`);
        const tools = await mcpService.getTools();
        console.log(`Tools for ${serverName}:`, Object.keys(tools).join(', ') || 'No tools found');
        console.log(`Successfully tested server: ${serverName}`);
      } catch (serverError: unknown) { // Catch for individual server processing
        console.error(`Failed to fully test server ${serverName}. Error details: ${serverError instanceof Error ? serverError.message : String(serverError)}`);
      }
    } // Closes for...of loop
  } catch (error) { // Catch for the main try block
    console.error('Error in main execution:', error);
  }
}

main().catch(error => {
  console.error('Unhandled error in main execution, caught by final .catch():', error);
});
