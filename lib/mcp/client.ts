import * as fs from 'fs';
import { Writable } from 'stream';
import { ChildProcess, spawn } from 'child_process';
import dns from 'dns';
import { experimental_createMCPClient } from 'ai'; // Removed LocalMCPToolSchema, MCPToolCallMessage, MCPToolResponseMessage as they are not found/needed for current compilation. SDKMCPToolDefinition import removed as it's not found.
import { Experimental_StdioMCPTransport } from 'ai/mcp-stdio'; // <-- Import from here
import { fileURLToPath } from 'url';
import { dirname, join as pathJoin } from 'path';

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
    this._initializeClient(); // Fire-and-forget initialization
  }

  private async _initializeClient(): Promise<void> {
    // Prevent re-initialization if already attempted
    if (this.clientInitializationStatus !== 'pending') {
      return;
    }

    try {
      console.log(`[${this.displayName}] Initializing MCP client with transport config:`, this.config.transport);

      let transportForClient: Experimental_StdioMCPTransport | { type: 'sse'; url: string; headers?: Record<string, string> };

      if (this.config.transport.type === 'sse') {
        const sseConfig = this.config.transport;
        transportForClient = { type: 'sse', url: sseConfig.url };
        if (sseConfig.headers) (transportForClient as SseTransportConfig).headers = sseConfig.headers;
      } else if (this.config.transport.type === 'stdio') {
        const stdioConfig = this.config.transport;
        transportForClient = new Experimental_StdioMCPTransport({
          command: stdioConfig.command,
          args: stdioConfig.args,
          env: stdioConfig.env as Record<string, string>, // SDK expects Record<string, string>
          cwd: stdioConfig.cwd,
          ...(stdioConfig.stderr && { stderr: stdioConfig.stderr }), // Pass stderr if defined
        });
      } else if (this.config.transport.type === 'custom') {
        throw new Error(`'custom' transport type for server '${this.displayName}' is not supported.`);
      } else {
        const transportFromConfig: unknown = this.config.transport;
        const transportTypeString = (transportFromConfig && typeof (transportFromConfig as Record<string, unknown>)?.type === 'string') ? (transportFromConfig as Record<string, unknown>)?.type : 'unknown';
        throw new Error(`Unsupported or misconfigured transport type ('${transportTypeString}') for server '${this.displayName}'.`);
      }

      const clientOptions: { name?: string; transport: typeof transportForClient } = { transport: transportForClient };
      if (this.config.name) clientOptions.name = this.config.name;

      console.log(`[${this.displayName}] Calling experimental_createMCPClient...`);
      this.mcpClient = await experimental_createMCPClient(clientOptions);
      this.clientInitializationStatus = 'success';
      console.log(`[${this.displayName}] MCP client initialized successfully.`);
      if (this.mcpClient) {
        console.log(`[${this.displayName}] MCP Client methods (debug):`, Object.keys(this.mcpClient));
      }

    } catch (error) {
      console.error(`[${this.displayName}] Failed to initialize MCP client:`, error);
      this.clientInitializationStatus = 'error';
      this.clientInitializationError = error instanceof Error ? error : new Error(String(error));
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
    if (this.config.transport.type !== 'stdio') {
      throw new Error(`[${this.displayName}] Expected stdio transport config`);
    }

    const stdioConfig = this.config.transport;
    let childProcess: ChildProcess | null = null;

    try {
      console.log(`[${this.displayName}] Creating child process for tool invocation: ${stdioConfig.command}`);
      
      // Network connectivity check for tools that might need external access
      if (['fetch', 'searxng', 'brave_web_search'].includes(toolName)) {
        console.log(`[${this.displayName}] 🌐 Tool '${toolName}' may require network access. Checking connectivity...`);
        
        // Quick DNS resolution test (doesn't add much delay but helps diagnose issues)
        try {
          await new Promise((resolve) => {
            dns.lookup('google.com', (err: NodeJS.ErrnoException | null) => {
              if (err) {
                console.warn(`[${this.displayName}] ⚠️ DNS resolution issue detected:`, err.message);
                console.warn(`[${this.displayName}] This might indicate WSL2 networking problems`);
              } else {
                console.log(`[${this.displayName}] ✅ Basic DNS resolution working`);
              }
              resolve(null); // Don't fail on DNS issues, just warn
            });
          });
        } catch (dnsError) {
          console.warn(`[${this.displayName}] DNS check failed, but continuing:`, dnsError);
        }
      }
      
      // Create child process
      childProcess = spawn(stdioConfig.command, stdioConfig.args || [], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { 
          ...process.env, 
          ...stdioConfig.env,
          // Add potentially missing network-related env vars for WSL2
          ...(process.platform === 'linux' && {
            'NODE_TLS_REJECT_UNAUTHORIZED': '0', // Help with HTTPS in WSL2
            'NPM_CONFIG_REGISTRY': 'https://registry.npmjs.org/',
          })
        },
        cwd: stdioConfig.cwd || process.cwd()
      });

      if (!childProcess.stdin || !childProcess.stdout) {
        throw new Error(`[${this.displayName}] Failed to create stdio streams for child process`);
      }

      // Set up error handling
      childProcess.on('error', (error) => {
        console.error(`[${this.displayName}] Child process error:`, error);
      });

      childProcess.on('exit', (code, signal) => {
        if (code !== 0) {
          console.error(`[${this.displayName}] Child process exited with code ${code}, signal ${signal}`);
        }
      });

      // Initialize MCP connection with handshake
      await this._initializeMCPConnection(childProcess);

      // Send tool call request
      const result = await this._sendMCPToolCall(childProcess, toolName, args);
      
      return result;

    } catch (error) {
      console.error(`[${this.displayName}] Error in stdio tool invocation:`, error);
      throw error;
    } finally {
      // Clean up child process
      if (childProcess) {
        childProcess.kill();
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
        console.error(`[${this.displayName}] MCP initialization timeout - no response received within 30 seconds`);
        console.error(`[${this.displayName}] This might indicate the MCP server is slow to start or having issues`);
        reject(new Error('MCP initialization timeout after 30 seconds'));
      }, 30000); // 30 second timeout

      let responseBuffer = '';
      let responseCount = 0;
      
      const responseHandler = (data: Buffer) => {
        const chunk = data.toString();
        responseCount++;
        console.log(`[${this.displayName}] Init received raw data (chunk ${responseCount}):`, JSON.stringify(chunk));
        responseBuffer += chunk;
        
        // Look for complete JSON-RPC messages (separated by newlines)
        const lines = responseBuffer.split('\n');
        responseBuffer = lines.pop() || ''; // Keep incomplete line in buffer
        
        for (const line of lines) {
          if (line.trim()) {
            console.log(`[${this.displayName}] Init processing line:`, JSON.stringify(line.trim()));
            try {
              const response = JSON.parse(line);
              console.log(`[${this.displayName}] Init parsed JSON response:`, response);
              
              if (response.id === 'init') {
                if (response.result) {
                  console.log(`[${this.displayName}] ✅ Initialization successful, sending initialized notification`);
                  
                  // Send initialized notification to complete the handshake
                  const initializedNotification = {
                    jsonrpc: "2.0",
                    method: "notifications/initialized",
                    params: {}
                  };
                  
                  const notificationString = JSON.stringify(initializedNotification) + '\n';
                  console.log(`[${this.displayName}] 📤 Sending initialized notification:`, notificationString.trim());
                  
                  try {
                    childProcess.stdin!.write(notificationString);
                    console.log(`[${this.displayName}] ✅ Initialized notification sent successfully`);
                    
                    clearTimeout(timeout);
                    childProcess.stdout!.off('data', responseHandler);
                    resolve();
                    return;
                  } catch (writeError) {
                    console.error(`[${this.displayName}] Error writing initialized notification:`, writeError);
                    clearTimeout(timeout);
                    childProcess.stdout!.off('data', responseHandler);
                    reject(new Error(`Failed to send initialized notification: ${writeError}`));
                    return;
                  }
                } else if (response.error) {
                  console.error(`[${this.displayName}] Initialization error:`, response.error);
                  clearTimeout(timeout);
                  childProcess.stdout!.off('data', responseHandler);
                  reject(new Error(`MCP initialization error: ${response.error.message || 'Unknown error'}`));
                  return;
                }
              }
            } catch (parseError) {
              console.warn(`[${this.displayName}] Failed to parse JSON line during init:`, JSON.stringify(line.trim()));
              console.warn(`[${this.displayName}] Parse error:`, parseError);
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
          console.log(`[${this.displayName}] Init stderr:`, stderrMsg);
          
          // Check for critical errors during startup
          if (stderrMsg.toLowerCase().includes('fatal') || 
              stderrMsg.toLowerCase().includes('cannot start') ||
              stderrMsg.toLowerCase().includes('permission denied')) {
            console.error(`[${this.displayName}] Critical error detected during initialization:`, stderrMsg);
          }
        });
      }

      // Monitor process exit during initialization
      const exitHandler = (code: number | null, signal: string | null) => {
        console.error(`[${this.displayName}] Process exited during initialization with code ${code}, signal ${signal}`);
        clearTimeout(timeout);
        if (childProcess.stdout) {
          childProcess.stdout.off('data', responseHandler);
        }
        reject(new Error(`Process exited during initialization: code ${code}, signal ${signal}`));
      };
      
      childProcess.on('exit', exitHandler);

      // Send initialization request
      const initRequest = {
        jsonrpc: "2.0",
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

      const requestString = JSON.stringify(initRequest) + '\n';
      console.log(`[${this.displayName}] 📤 Sending initialization request:`, requestString.trim());
      
      try {
        childProcess.stdin.write(requestString);
        console.log(`[${this.displayName}] ✅ Initialization request sent successfully`);
      } catch (writeError) {
        clearTimeout(timeout);
        childProcess.stdout.off('data', responseHandler);
        childProcess.off('exit', exitHandler);
        console.error(`[${this.displayName}] Error writing initialization request:`, writeError);
        reject(new Error(`Failed to send initialization request: ${writeError}`));
      }
    });
  }

  /**
   * Send MCP tool call request and wait for response
   */
  private async _sendMCPToolCall(childProcess: ChildProcess, toolName: string, args: Record<string, unknown>): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!childProcess.stdin || !childProcess.stdout) {
        reject(new Error('Child process streams not available'));
        return;
      }

      const requestId = Math.random().toString(36).substring(2, 15);
      // Increased timeout from 30s to 90s for longer-running tools
      const timeout = setTimeout(() => {
        console.error(`[${this.displayName}] Tool call timeout for '${toolName}' - no response received within 90 seconds`);
        console.error(`[${this.displayName}] This suggests the MCP server may be taking longer than expected or hanging`);
        reject(new Error(`Tool call timeout for '${toolName}' after 90 seconds`));
      }, 90000); // 90 second timeout

      let responseBuffer = '';
      let responseCount = 0;
      
      const responseHandler = (data: Buffer) => {
        const chunk = data.toString();
        responseCount++;
        console.log(`[${this.displayName}] Tool call received raw data (chunk ${responseCount}):`, JSON.stringify(chunk));
        responseBuffer += chunk;
        
        // Look for complete JSON-RPC messages
        const lines = responseBuffer.split('\n');
        responseBuffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.trim()) {
            console.log(`[${this.displayName}] Tool call processing line:`, JSON.stringify(line.trim()));
            try {
              const response = JSON.parse(line);
              console.log(`[${this.displayName}] Tool call parsed JSON response:`, response);
              
              if (response.id === requestId) {
                console.log(`[${this.displayName}] ✅ Found matching response for request ID ${requestId}`);
                clearTimeout(timeout);
                childProcess.stdout!.off('data', responseHandler);
                
                if (response.error) {
                  console.error(`[${this.displayName}] Tool call error response:`, response.error);
                  reject(new Error(`MCP Error: ${response.error.message || 'Unknown error'}`));
                } else {
                  console.log(`[${this.displayName}] Tool call successful result:`, response.result);
                  
                  // Handle MCP CallToolResult format properly
                  let processedResult = response.result;
                  
                  // Check if this is a standard MCP CallToolResult with content array
                  if (response.result && typeof response.result === 'object' && 'content' in response.result) {
                    const mcpResult = response.result as { content?: unknown[]; isError?: boolean };
                    
                    if (mcpResult.isError) {
                      console.error(`[${this.displayName}] Tool execution failed (isError=true):`, mcpResult);
                      reject(new Error(`Tool execution failed: ${JSON.stringify(mcpResult.content || 'Unknown error')}`));
                      return;
                    }
                    
                    if (Array.isArray(mcpResult.content)) {
                      console.log(`[${this.displayName}] Processing MCP content array with ${mcpResult.content.length} items`);
                      
                      // Extract text content from MCP content array
                      const textContents: string[] = [];
                      
                      for (const contentItem of mcpResult.content) {
                        if (contentItem && typeof contentItem === 'object') {
                          const item = contentItem as Record<string, unknown>;
                          if (item.type === 'text' && typeof item.text === 'string') {
                            textContents.push(item.text);
                            console.log(`[${this.displayName}] Extracted text content:`, item.text.substring(0, 100) + '...');
                          } else if (item.type === 'image') {
                            textContents.push(`[Image: ${item.data ? 'base64 data' : 'no data'}]`);
                            console.log(`[${this.displayName}] Found image content`);
                          } else {
                            // Handle other content types or plain objects
                            textContents.push(JSON.stringify(contentItem));
                            console.log(`[${this.displayName}] Found other content type:`, item.type || 'unknown');
                          }
                        } else if (typeof contentItem === 'string') {
                          textContents.push(contentItem);
                          console.log(`[${this.displayName}] Found plain string content`);
                        }
                      }
                      
                      // Return combined text or structured data based on content
                      if (textContents.length === 1) {
                        processedResult = textContents[0];
                      } else if (textContents.length > 1) {
                        processedResult = textContents.join('\n\n');
                      } else {
                        // No text content found, return the original content array
                        processedResult = mcpResult.content;
                      }
                      
                      console.log(`[${this.displayName}] Processed MCP result:`, 
                        typeof processedResult === 'string' 
                          ? processedResult.substring(0, 200) + '...' 
                          : processedResult);
                    } else {
                      console.log(`[${this.displayName}] MCP result content is not an array, using as-is`);
                      processedResult = mcpResult.content || response.result;
                    }
                  } else {
                    console.log(`[${this.displayName}] Non-MCP result format, using as-is`);
                  }
                  
                  resolve(processedResult);
                }
              } else {
                console.log(`[${this.displayName}] ⚠️ Received response with different ID: ${response.id}, expected: ${requestId}`);
              }
            } catch (parseError) {
              console.warn(`[${this.displayName}] Failed to parse JSON line in tool call:`, JSON.stringify(line.trim()));
              console.warn(`[${this.displayName}] Parse error:`, parseError);
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
          console.log(`[${this.displayName}] Tool call stderr:`, stderrMsg);
          
          // Check for common MCP server errors that might indicate the tool call failed
          if (stderrMsg.toLowerCase().includes('error') || 
              stderrMsg.toLowerCase().includes('failed') ||
              stderrMsg.toLowerCase().includes('timeout')) {
            console.warn(`[${this.displayName}] Potential error detected in stderr:`, stderrMsg);
          }
        });
      }

      // Send tool call request
      const toolRequest = {
        jsonrpc: "2.0",
        id: requestId,
        method: "tools/call",
        params: {
          name: toolName,
          arguments: args
        }
      };

      const requestString = JSON.stringify(toolRequest) + '\n';
      console.log(`[${this.displayName}] 📤 Sending tool call request:`, requestString.trim());
      console.log(`[${this.displayName}] 📤 Request details - ID: ${requestId}, Tool: ${toolName}, Args:`, args);
      
      try {
        childProcess.stdin.write(requestString);
        console.log(`[${this.displayName}] ✅ Tool call request sent successfully`);
      } catch (writeError) {
        clearTimeout(timeout);
        childProcess.stdout.off('data', responseHandler);
        console.error(`[${this.displayName}] Error writing tool call request:`, writeError);
        reject(new Error(`Failed to send tool call request: ${writeError}`));
      }
    });
  }
}

/**
 * Loads application configuration from config.json.
 * Assumes config.json is in the project root, two levels up from this file's directory (lib/ai/).
 */
export function getAppConfig(): AppConfig {
  const __filename = fileURLToPath(import.meta.url);
  const currentDir = dirname(__filename);
  const configPath = pathJoin(currentDir, '..', '..', 'config.json'); 
  
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