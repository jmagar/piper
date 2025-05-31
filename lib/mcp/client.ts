import 'server-only';
import * as fs from 'fs';
import { Writable } from 'stream';
import { ChildProcess, spawn } from 'child_process';
// import dns from 'dns'; // Unused
import { experimental_createMCPClient } from 'ai';
import { Experimental_StdioMCPTransport } from 'ai/mcp-stdio'; // Re-added

import { join as pathJoin } from 'path';

// Import our logging system
import { McpOperation } from '@/lib/logger/types';
import { 
  mcpLogger, 
  JsonRpcMessageType, 
  McpTransportType, 
  // JsonRpcMessage, // Unused
} from '@/lib/logger/mcp-logger';
// import { McpLogEntry } from '@/lib/logger/types'; // Unused
// import { correlationMiddleware } from '@/middleware/correlation'; // Unused
import { generateCorrelationId } from '@/lib/logger/correlation';
// Using simple console logging instead of complex logger system
const appLogger = {
  mcp: {
    info: (message: string, metadata?: Record<string, unknown>) => console.log(`[MCP INFO] ${message}`, metadata),
    error: (message: string, error?: Error | unknown, metadata?: Record<string, unknown>) => {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error(`[MCP ERROR] ${message}`, err, metadata);
    },
    debug: (message: string, metadata?: Record<string, unknown> | string | number) => console.log(`[MCP DEBUG] ${message}`, metadata),
    warn: (message: string, metadata?: Record<string, unknown> | string | unknown) => console.warn(`[MCP WARN] ${message}`, metadata),
  }
};

// Define a local representation of what we expect from the SDK's tool definition
// This helps in type-safe access within fetchToolsAndStatus
export interface LocalMCPToolDefinition {
  name?: string;
  description?: string;
  inputSchema?: LocalMCPToolSchema; // Use the defined LocalMCPToolSchema
  annotations?: unknown; // Or a more specific type if known from SDK
  // Allow other properties from the actual MCPToolDefinition
  [key: string]: unknown;
}

// Structure of individual tools as returned by MCPService's fetchToolsAndStatus
export interface FetchedToolInfo {
  name: string;
  description?: string;
  inputSchema?: unknown;
  annotations?: unknown;
  [key: string]: unknown;
}

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
  disabled?: boolean; // Added to allow disabling servers from config
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

// More specific server config types based on transport
export type StdioServerConfig = ServerConfigEntry & { transport: StdioTransportConfig };
export type SSEServerConfig = ServerConfigEntry & { transport: SseTransportConfig };

/**
 * MCPService manages the lifecycle and interaction with an MCP client.
 */
export class MCPService {
  // Status of the MCP client itself, distinct from operational status derived from tool fetching
  private clientInitializationStatus: 'pending' | 'success' | 'error' = 'pending';
  private clientInitializationError?: Error;
  private mcpClient: (Awaited<ReturnType<typeof experimental_createMCPClient>> & { tools: (schemas?: Record<string, LocalMCPToolSchema>) => Promise<Record<string, LocalMCPToolDefinition>> }) | null = null;
  private config: ServerConfigEntry;
  private displayName: string; // For logging
  private isTransportHealthyForStdio: boolean = true; // Flag for stdio transport health

  constructor(config: ServerConfigEntry, serverKey: string) {
    this.config = config;
    this.displayName = config.label || serverKey;
    
    // Log server startup
    mcpLogger.logServerLifecycle(McpOperation.SERVER_STARTUP, serverKey, {
      serverInfo: {
        name: config.name || this.displayName,
        version: '1.0.0',
        transport: config.transport.type === 'stdio' ? McpTransportType.STDIO : McpTransportType.SSE,
        status: 'initializing'
      },
      metadata: {
        command: config.transport.type === 'stdio' ? config.transport.command : undefined,
        args: config.transport.type === 'stdio' ? config.transport.args : undefined,
        env: config.transport.type === 'stdio' ? config.transport.env : undefined
      }
    });

    this._initializeClient(); // Fire-and-forget initialization
  }

  private async _initializeClient(): Promise<void> {
    try {
      appLogger.mcp.info(`Initializing MCP client: ${this.displayName}`);
      
      if (this.config.transport.type === 'stdio') {
        const stdioConfig = this.config.transport; // Directly use the narrowed type
        
        // Log initialization start
        mcpLogger.logServerLifecycle(McpOperation.INITIALIZE, this.displayName, {
          metadata: {
            transport: 'stdio',
            command: stdioConfig.command,
            args: stdioConfig.args
          }
        });

        this.mcpClient = await experimental_createMCPClient({
          transport: new Experimental_StdioMCPTransport({
            command: stdioConfig.command,
            args: stdioConfig.args || [],
            env: Object.fromEntries( // Ensure this results in Record<string, string>
              Object.entries({ ...process.env, ...stdioConfig.env })
                .filter(([, value]) => typeof value === 'string') as [string, string][]
            ),
            // TODO: Consider if stderr needs to be passed or handled, e.g., stdioConfig.stderr
          }),
        });
        
        // Log successful initialization
        mcpLogger.logServerLifecycle(McpOperation.INITIALIZE, this.displayName, {
          protocolVersion: '2024-11-05',
          metadata: { initializationType: 'experimental_createMCPClient' }
        });
        
      } else if (this.config.transport.type === 'sse') {
        const sseConfig = this.config.transport; // Type is SseTransportConfig here
        
        if (!sseConfig.url) {
          throw new Error('SSE transport URL is missing in configuration.');
        }

        // Log SSE initialization
        mcpLogger.logServerLifecycle(McpOperation.INITIALIZE, this.displayName, {
          metadata: {
            transport: 'sse',
            url: sseConfig.url
          }
        });

        this.mcpClient = await experimental_createMCPClient({
          transport: {
            type: 'sse',
            url: sseConfig.url, // Now confirmed to be a string
          },
        });
        
        mcpLogger.logServerLifecycle(McpOperation.INITIALIZE, this.displayName, {
          protocolVersion: '2024-11-05',
          metadata: { initializationType: 'experimental_createMCPClient' }
        });
      } else {
        throw new Error(`Unsupported transport: ${this.config.transport.type}`);
      }

      this.clientInitializationStatus = 'success';
      appLogger.mcp.info(`✅ MCP client initialized successfully: ${this.displayName}`);
      
    } catch (error: unknown) {
      this.clientInitializationStatus = 'error';
      this.clientInitializationError = error instanceof Error ? error : new Error(String(error));
      
      // Log initialization error
      mcpLogger.logServerLifecycle(McpOperation.ERROR_HANDLING, this.displayName, {
        error: this.clientInitializationError,
        metadata: { 
          phase: 'initialization',
          transport: this.config.transport.type
        }
      });
      
      appLogger.mcp.error(`❌ Failed to initialize MCP client: ${this.displayName}`, this.clientInitializationError);
    }
  }

  /**
   * Fetches tools from the MCP client and determines the server's operational status.
   * @returns A promise that resolves to the server's status, tools, and error details.
   */
  async fetchToolsAndStatus(): Promise<{
    status: 'uninitialized' | 'connected' | 'error' | 'no_tools_found'; // 'disabled' will be handled by manager
    tools: Array<FetchedToolInfo>;
    errorDetails?: string;
    transportType: MCPTransportConfig['type'];
  }> {
    const transportType = this.config.transport.type;

    // Wait for initialization to complete if it's still pending
    // This simple loop is okay for a short-lived pending state. For longer, consider a more robust promise-based wait.
    while (this.clientInitializationStatus === 'pending') {
      await new Promise(resolve => setTimeout(resolve, 50)); // Brief pause
    }

    if (this.clientInitializationStatus === 'error') {
      return {
        status: 'error',
        tools: [],
        errorDetails: `Client initialization failed: ${this.clientInitializationError?.message || 'Unknown error'}`, 
        transportType,
      };
    }

    if (!this.mcpClient) { // Should be caught by clientInitializationStatus === 'error'
      return { status: 'error', tools: [], errorDetails: 'MCP Client is not available.', transportType: this.config.transport.type };
    }

    try {
      console.log(`[${this.displayName}] Fetching tools...`);
      // The SDK's .tools() method likely returns a Record<string, MCPToolDefinition>
      // where MCPToolDefinition might include name, description, inputSchema, etc.
      // tools() likely returns Record<string, unknown> or a more specific SDK type if available
      const toolsRecord = await this.mcpClient.tools(this.config.schemas || undefined) as Record<string, LocalMCPToolDefinition>;
      
      const toolsArray: FetchedToolInfo[] = Object.entries(toolsRecord || {}).map(([name, toolDef]) => {
        // toolDef is now LocalMCPToolDefinition
        const toolEntry: FetchedToolInfo = {
          name: toolDef.name || name, // Prefer name from definition, fallback to key
          description: toolDef.description,
        };
        if (toolDef.inputSchema) {
          toolEntry.inputSchema = toolDef.inputSchema;
        }
        if (toolDef.annotations) {
          toolEntry.annotations = toolDef.annotations;
        }
        // If LocalMCPToolDefinition could have other dynamic properties you want to carry over:
        // Object.keys(toolDef).forEach(key => {
        //   if (!['name', 'description', 'inputSchema', 'annotations'].includes(key)) {
        //     toolEntry[key] = toolDef[key];
        //   }
        // });
        return toolEntry;
      });

      if (toolsArray.length === 0) {
        console.log(`[${this.displayName}] No tools found.`);
        return { status: 'no_tools_found', tools: [], transportType: this.config.transport.type };
      }

      console.log(`[${this.displayName}] Found ${toolsArray.length} tools.`);
      let currentStatus: 'uninitialized' | 'connected' | 'error' | 'no_tools_found' = 'connected';
      let currentTools: FetchedToolInfo[] = toolsArray;
      let currentErrorDetails: string | undefined = undefined;

      if (toolsArray.length === 0) {
        console.log(`[${this.displayName}] No tools found.`);
        currentStatus = 'no_tools_found';
      } else {
        console.log(`[${this.displayName}] Found ${toolsArray.length} tools.`);
      }

      // For stdio transport, if the SDK's logger indicated unhealthiness, override status to 'error'.
      if (this.config.transport.type === 'stdio' && !this.isTransportHealthyForStdio) {
        // If transport is unhealthy, the status must be 'error', tools cleared, and details noted.
        // This overrides any prior determination of 'connected' or 'no_tools_found'.
        console.warn(
          `[${this.displayName}] Overriding status '${currentStatus}' to 'error' because stdio transport was marked unhealthy.`,
        );
        currentStatus = 'error';
        currentTools = [];
        currentErrorDetails = 'Stdio transport reported unhealthy via SDK logs.';
      }
      return { status: currentStatus, tools: currentTools, errorDetails: currentErrorDetails, transportType: this.config.transport.type };
    } catch (error) {
      console.error(`[${this.displayName}] Failed to fetch tools:`, error);
      // Ensure isTransportHealthyForStdio is also false if an explicit error occurs during fetch
      if (this.config.transport.type === 'stdio') {
        this.isTransportHealthyForStdio = false;
      }
      return {
        status: 'error',
        tools: [],
        errorDetails: error instanceof Error ? error.message : String(error),
        transportType: this.config.transport.type,
      };
    }
  }

  /**
   * Invokes a tool on the MCP server using direct MCP protocol communication.
   * This is only used for STDIO tools since SSE tools are handled automatically by AI SDK.
   */
  public async invokeTool(toolName: string, args: Record<string, unknown>): Promise<unknown> {
    if (this.clientInitializationStatus === 'pending') {
      // Wait for initialization to complete
      let waitCycles = 0;
      while (this.clientInitializationStatus === 'pending' && waitCycles < 100) { // Max 5s wait
        await new Promise(resolve => setTimeout(resolve, 50));
        waitCycles++;
      }
      if (this.clientInitializationStatus === 'pending') {
        console.error(`[${this.displayName}] MCP client did not initialize in time for invokeTool call to '${toolName}'.`);
        throw new Error(`[${this.displayName}] MCP client did not initialize in time for invokeTool.`);
      }
    }

    if (this.clientInitializationStatus === 'error' || !this.mcpClient) {
      console.error(`[${this.displayName}] MCP client not initialized or in error state. Cannot invoke tool '${toolName}'. Error: ${this.clientInitializationError?.message}`);
      throw new Error(`[${this.displayName}] MCP client not initialized or in error state. Cannot invoke tool '${toolName}'. Error: ${this.clientInitializationError?.message}`);
    }

    try {
      console.log(`[${this.displayName}] Invoking tool '${toolName}' with args:`, args);
      
    // Since experimental_createMCPClient doesn't provide direct tool invocation,
    // we need to implement direct MCP protocol communication based on transport type
    const result = await this._directMCPInvoke(toolName, args);
      
      console.log(`[${this.displayName}] Result for tool '${toolName}':`, result);
      return result;
    } catch (error) {
      console.error(`[${this.displayName}] Error invoking tool '${toolName}':`, error);
      throw error; 
    }
  }

  /**
   * Implements direct MCP protocol communication for tool invocation
   * since experimental_createMCPClient doesn't provide an invoke method.
   */
  private async _directMCPInvoke(toolName: string, args: Record<string, unknown>): Promise<unknown> {
    const transportType = this.config.transport.type;
    
    if (transportType === 'stdio') {
      return this._invokeViaStdio(toolName, args);
    } else if (transportType === 'sse') {
      throw new Error(`[${this.displayName}] Direct tool invocation not implemented for SSE transport type.`);
    } else {
      throw new Error(`[${this.displayName}] Direct tool invocation not implemented for unsupported transport type: ${transportType}`);
    }
  }

  /**
   * Invoke tool via stdio transport using MCP protocol over the child process
   */
  private async _invokeViaStdio(toolName: string, args: Record<string, unknown>): Promise<unknown> {
    const stdioConfig = this.config.transport as StdioTransportConfig; // Ensure it is StdioTransportConfig
    let childProcess: ChildProcess | null = null;

    // Start tool execution logging
            const requestId = generateCorrelationId();
    const executionId = mcpLogger.logToolExecutionStart(toolName, this.displayName, requestId, args);

    try {
      appLogger.mcp.info(`🔧 Invoking ${toolName} via stdio for ${this.displayName}...`);
      
      // Ensure command is a string
      if (typeof stdioConfig.command !== 'string') {
        throw new Error('Stdio command must be a string.');
      }

      // Create child process
      childProcess = spawn(stdioConfig.command, stdioConfig.args || [], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          ...stdioConfig.env,
          NODE_ENV: process.env.NODE_ENV || 'development',
          ...(process.platform === 'linux' && {
            NODE_TLS_REJECT_UNAUTHORIZED: '0',
            NPM_CONFIG_REGISTRY: 'https://registry.npmjs.org/',
          }),
        } as NodeJS.ProcessEnv,
        cwd: stdioConfig.cwd || process.cwd()
      });

      if (!childProcess || !childProcess.stdin || !childProcess.stdout) {
        throw new Error(`Failed to create stdio streams for child process`);
      }

      // ---- Store a reference to the non-null childProcess ----
      const currentChildProcess = childProcess;

      // Set up error handling with logging
      currentChildProcess.on('error', (error) => {
        appLogger.mcp.error(`Child process error for ${this.displayName}:`, error);
        mcpLogger.logServerLifecycle(McpOperation.ERROR_HANDLING, this.displayName, {
          error,
          metadata: { phase: 'process_execution', toolName }
        });
      });

      currentChildProcess.on('exit', (code, signal) => {
        if (code !== 0) {
          const error = new Error(`Child process exited with code ${code}, signal ${signal}`);
          appLogger.mcp.error(`Child process exit error for ${this.displayName}:`, error);
          mcpLogger.logServerLifecycle(McpOperation.ERROR_HANDLING, this.displayName, {
            error,
            metadata: { phase: 'process_exit', exitCode: code, signal, toolName }
          });
        }
      });

      // Initialize MCP connection with handshake
      await this._initializeMCPConnection(currentChildProcess);

      // Send tool call request
      const result = await this._sendMCPToolCall(currentChildProcess, toolName, args);
      
      // Log successful tool execution
      mcpLogger.logToolExecutionEnd(executionId, { result });
      
      return result;

    } catch (error) {
      appLogger.mcp.error(`Error in stdio tool invocation for ${this.displayName}:`, error);
      
      // Log tool execution error
      mcpLogger.logToolExecutionEnd(executionId, { 
        error: error instanceof Error ? error : new Error(String(error))
      });
      
      throw error;
    } finally {
      // Clean up child process
      if (childProcess) {
        childProcess.kill();
        
        // Log server shutdown
        mcpLogger.logServerLifecycle(McpOperation.SERVER_SHUTDOWN, this.displayName, {
          metadata: { reason: 'tool_execution_complete', toolName }
        });
      }
    }
  }

  /**
   * Initialize MCP connection with handshake
   */
  private async _initializeMCPConnection(childProcess: ChildProcess): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!childProcess.stdin || !childProcess.stdout) {
        reject(new Error('Child process streams not available'));
        return;
      }

      // Increased timeout from 10s to 30s to handle slower-starting servers
      const timeout = setTimeout(() => {
        const error = new Error('MCP initialization timeout after 30 seconds');
        appLogger.mcp.error(`MCP initialization timeout for ${this.displayName}`, error);
        mcpLogger.logServerLifecycle(McpOperation.ERROR_HANDLING, this.displayName, {
          error,
          metadata: { phase: 'initialization_timeout' }
        });
        reject(error);
      }, 30000); // 30 second timeout

      let responseBuffer = '';
      let responseCount = 0;
      
      const responseHandler = (data: Buffer) => {
        const chunk = data.toString();
        responseCount++;
        appLogger.mcp.debug(`Init received raw data (chunk ${responseCount}) for ${this.displayName}:`, JSON.stringify(chunk));
        responseBuffer += chunk;
        
        // Look for complete JSON-RPC messages (separated by newlines)
        const lines = responseBuffer.split('\n');
        responseBuffer = lines.pop() || ''; // Keep incomplete line in buffer
        
        for (const line of lines) {
          if (line.trim()) {
            appLogger.mcp.debug(`Init processing line for ${this.displayName}:`, JSON.stringify(line.trim()));
            try {
              const response = JSON.parse(line);
              
              // Log the JSON-RPC message
              mcpLogger.logJsonRpcMessage(
                response,
                response.error ? JsonRpcMessageType.ERROR : JsonRpcMessageType.RESPONSE,
                this.displayName,
                McpTransportType.STDIO
              );
              
              appLogger.mcp.debug(`Init parsed JSON response for ${this.displayName}:`, response);
              
              if (response.id === 'init') {
                if (response.result) {
                  appLogger.mcp.info(`✅ Initialization successful for ${this.displayName}, sending initialized notification`);
                  
                  // Send initialized notification to complete the handshake
                  const initializedNotification = {
                    jsonrpc: "2.0" as const,
                    method: "notifications/initialized",
                    params: {}
                  };
                  
                  // Log the notification
                  mcpLogger.logJsonRpcMessage(
                    initializedNotification,
                    JsonRpcMessageType.NOTIFICATION,
                    this.displayName,
                    McpTransportType.STDIO
                  );
                  
                  const notificationString = JSON.stringify(initializedNotification) + '\n';
                  appLogger.mcp.debug(`📤 Sending initialized notification for ${this.displayName}:`, notificationString.trim());
                  
                  try {
                    childProcess.stdin!.write(notificationString);
                    appLogger.mcp.info(`✅ Initialized notification sent successfully for ${this.displayName}`);
                    
                    clearTimeout(timeout);
                    childProcess.stdout!.off('data', responseHandler);
                    resolve();
                    return;
                  } catch (writeError) {
                    const error = new Error(`Failed to send initialized notification: ${writeError}`);
                    appLogger.mcp.error(`Error writing initialized notification for ${this.displayName}:`, error);
                    mcpLogger.logServerLifecycle(McpOperation.ERROR_HANDLING, this.displayName, {
                      error,
                      metadata: { phase: 'notification_send' }
                    });
                    clearTimeout(timeout);
                    childProcess.stdout!.off('data', responseHandler);
                    reject(error);
                    return;
                  }
                } else if (response.error) {
                  const error = new Error(`MCP initialization error: ${response.error.message || 'Unknown error'}`);
                  appLogger.mcp.error(`Initialization error for ${this.displayName}:`, response.error);
                  mcpLogger.logServerLifecycle(McpOperation.ERROR_HANDLING, this.displayName, {
                    error,
                    metadata: { phase: 'initialization_response', mcpError: response.error }
                  });
                  clearTimeout(timeout);
                  childProcess.stdout!.off('data', responseHandler);
                  reject(error);
                  return;
                }
              }
            } catch (parseError) {
              appLogger.mcp.warn(`Failed to parse JSON line during init for ${this.displayName}:`, JSON.stringify(line.trim()));
              appLogger.mcp.warn(`Parse error for ${this.displayName}:`, parseError);
              // Continue processing other lines
            }
          }
        }
      };

      childProcess.stdout.on('data', responseHandler);

      // Enhanced stderr monitoring during initialization
      if (childProcess.stderr) {
        childProcess.stderr.on('data', (data) => {
          const stderrMsg = data.toString();
          appLogger.mcp.debug(`Init stderr for ${this.displayName}:`, stderrMsg);
          
          // Check for critical errors during startup
          if (stderrMsg.toLowerCase().includes('fatal') || 
              stderrMsg.toLowerCase().includes('cannot start') ||
              stderrMsg.toLowerCase().includes('permission denied')) {
            const error = new Error(`Critical error detected during initialization: ${stderrMsg}`);
            appLogger.mcp.error(`Critical error detected during initialization for ${this.displayName}:`, error);
            mcpLogger.logServerLifecycle(McpOperation.ERROR_HANDLING, this.displayName, {
              error,
              metadata: { phase: 'stderr_critical', stderrMsg }
            });
          }
        });
      }

      // Monitor process exit during initialization
      const exitHandler = (code: number | null, signal: string | null) => {
        const error = new Error(`Process exited during initialization: code ${code}, signal ${signal}`);
        appLogger.mcp.error(`Process exited during initialization for ${this.displayName}:`, error);
        mcpLogger.logServerLifecycle(McpOperation.ERROR_HANDLING, this.displayName, {
          error,
          metadata: { phase: 'process_exit_during_init', exitCode: code, signal }
        });
        clearTimeout(timeout);
        if (childProcess.stdout) {
          childProcess.stdout.off('data', responseHandler);
        }
        reject(error);
      };
      
      childProcess.on('exit', exitHandler);

      // Send initialization request
      const initRequest = {
        jsonrpc: "2.0" as const,
        id: "init",
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {
            tools: {}
          },
          clientInfo: {
            name: this.config.name || "piper-mcp-client",
            version: "1.0.0"
          }
        }
      };

      // Log the initialization request
      mcpLogger.logJsonRpcMessage(
        initRequest,
        JsonRpcMessageType.REQUEST,
        this.displayName,
        McpTransportType.STDIO
      );

      const requestString = JSON.stringify(initRequest) + '\n';
      appLogger.mcp.debug(`📤 Sending initialization request for ${this.displayName}:`, requestString.trim());
      
      try {
        childProcess.stdin.write(requestString);
        appLogger.mcp.info(`✅ Initialization request sent successfully for ${this.displayName}`);
      } catch (writeError) {
        const error = new Error(`Failed to send initialization request: ${writeError}`);
        clearTimeout(timeout);
        childProcess.stdout.off('data', responseHandler);
        childProcess.off('exit', exitHandler);
        appLogger.mcp.error(`Error writing initialization request for ${this.displayName}:`, error);
        mcpLogger.logServerLifecycle(McpOperation.ERROR_HANDLING, this.displayName, {
          error,
          metadata: { phase: 'request_send' }
        });
        reject(error);
      }
    });
  }

  /**
   * Send MCP tool call request and wait for response
   */
  private async _sendMCPToolCall(childProcess: ChildProcess, toolName: string, args: Record<string, unknown>): Promise<unknown> {
    const requestId = `tool-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return new Promise((resolve, reject) => {
      if (!childProcess.stdin || !childProcess.stdout) {
        reject(new Error('Child process streams not available'));
        return;
      }

      const timeout = setTimeout(() => {
        const error = new Error(`Tool call timeout after 60 seconds for tool: ${toolName}`);
        appLogger.mcp.error(`Tool call timeout for ${this.displayName}:`, error);
        mcpLogger.logServerLifecycle(McpOperation.ERROR_HANDLING, this.displayName, {
          error,
          metadata: { phase: 'tool_call_timeout', toolName, requestId }
        });
        reject(error);
      }, 60000); // 60 second timeout

      let responseBuffer = '';
      let responseCount = 0;
      
      const responseHandler = (data: Buffer) => {
        const chunk = data.toString();
        responseCount++;
        appLogger.mcp.debug(`Tool call received raw data (chunk ${responseCount}) for ${this.displayName}:`, JSON.stringify(chunk));
        responseBuffer += chunk;
        
        // Look for complete JSON-RPC messages
        const lines = responseBuffer.split('\n');
        responseBuffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.trim()) {
            appLogger.mcp.debug(`Tool call processing line for ${this.displayName}:`, JSON.stringify(line.trim()));
            try {
              const response = JSON.parse(line);
              
              // Log the JSON-RPC response
              mcpLogger.logJsonRpcMessage(
                response,
                response.error ? JsonRpcMessageType.ERROR : JsonRpcMessageType.RESPONSE,
                this.displayName,
                McpTransportType.STDIO
              );
              
              appLogger.mcp.debug(`Tool call parsed JSON response for ${this.displayName}:`, response);
              
              if (response.id === requestId) {
                clearTimeout(timeout);
                childProcess.stdout!.off('data', responseHandler);
                
                if (response.error) {
                  const error = mcpLogger.createMcpError(
                    response.error.code,
                    response.error.message,
                    response.error.data
                  );
                  appLogger.mcp.error(`Tool call error for ${this.displayName}:`, error);
                  reject(error);
                  return;
                }

                if (response.result) {
                  let processedResult = response.result;
                  
                  // Process MCP result format
                  if (response.result && typeof response.result === 'object') {
                    const mcpResult = response.result as { content?: Array<{ type: string; text?: string; data?: string }> };
                    
                    if (mcpResult.content && Array.isArray(mcpResult.content)) {
                      appLogger.mcp.debug(`Processing MCP result content array for ${this.displayName}, length:`, mcpResult.content.length);
                      
                      processedResult = mcpResult.content
                        .filter(item => item.type === 'text' && item.text)
                        .map(item => item.text)
                        .join('\n');
                      
                      appLogger.mcp.debug(`Processed MCP result for ${this.displayName}:`, 
                        typeof processedResult === 'string' 
                          ? processedResult.substring(0, 200) + '...' 
                          : processedResult);
                    } else {
                      appLogger.mcp.debug(`MCP result content is not an array for ${this.displayName}, using as-is`);
                      processedResult = mcpResult.content || response.result;
                    }
                  } else {
                    appLogger.mcp.debug(`Non-MCP result format for ${this.displayName}, using as-is`);
                  }
                  
                  resolve(processedResult);
                }
              } else {
                appLogger.mcp.warn(`⚠️ Received response with different ID for ${this.displayName}: ${response.id}, expected: ${requestId}`);
              }
            } catch (parseError) {
              appLogger.mcp.warn(`Failed to parse JSON line in tool call for ${this.displayName}:`, JSON.stringify(line.trim()));
              appLogger.mcp.warn(`Parse error for ${this.displayName}:`, parseError);
              // Continue processing other lines
            }
          }
        }
      };

      childProcess.stdout.on('data', responseHandler);

      // Enhanced stderr monitoring
      if (childProcess.stderr) {
        childProcess.stderr.on('data', (data) => {
          const stderrMsg = data.toString();
          appLogger.mcp.debug(`Tool call stderr for ${this.displayName}:`, stderrMsg);
          
          // Check for common MCP server errors that might indicate the tool call failed
          if (stderrMsg.toLowerCase().includes('error') || 
              stderrMsg.toLowerCase().includes('failed') ||
              stderrMsg.toLowerCase().includes('timeout')) {
            appLogger.mcp.warn(`Potential error detected in stderr for ${this.displayName}:`, stderrMsg);
          }
        });
      }

      // Send tool call request
      const toolRequest = {
        jsonrpc: "2.0" as const,
        id: requestId,
        method: "tools/call",
        params: {
          name: toolName,
          arguments: args
        }
      };

      // Log the tool call request
      mcpLogger.logJsonRpcMessage(
        toolRequest,
        JsonRpcMessageType.REQUEST,
        this.displayName,
        McpTransportType.STDIO
      );

      const requestString = JSON.stringify(toolRequest) + '\n';
      appLogger.mcp.debug(`📤 Sending tool call request for ${this.displayName}:`, requestString.trim());
      appLogger.mcp.debug(`📤 Request details for ${this.displayName} - ID: ${requestId}, Tool: ${toolName}, Args:`, args);
      
      try {
        childProcess.stdin.write(requestString);
        appLogger.mcp.info(`✅ Tool call request sent successfully for ${this.displayName}`);
      } catch (writeError) {
        const error = new Error(`Failed to send tool call request: ${writeError}`);
        clearTimeout(timeout);
        childProcess.stdout.off('data', responseHandler);
        appLogger.mcp.error(`Error writing tool call request for ${this.displayName}:`, error);
        mcpLogger.logServerLifecycle(McpOperation.ERROR_HANDLING, this.displayName, {
          error,
          metadata: { phase: 'tool_request_send', toolName, requestId }
        });
        reject(error);
      }
    });
  }
}

/**
 * Loads application configuration from config.json.
 * Assumes config.json is in the project root, two levels up from this file's directory (lib/ai/).
 */
export function getAppConfig(): AppConfig {
  const configPath = pathJoin(process.env.CONFIG_DIR || '/config', 'config.json'); 
  
  try {
    const rawConfig = fs.readFileSync(configPath, 'utf-8');
    const parsedConfig = JSON.parse(rawConfig);
    // Only log config details once during startup or when there are issues
    if (!parsedConfig.mcpServers) {
      console.error('config.json is missing the mcpServers property.');
      return { mcpServers: {} };
    }
    return parsedConfig;
  } catch (error) {
    console.error(`Failed to load or parse config.json from ${configPath}:`, error);
    return { mcpServers: {} };
  }
}