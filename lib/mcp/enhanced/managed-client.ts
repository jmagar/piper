import { appLogger, type ContextualLogMethods } from '@/lib/logger';
import { mcpLogger } from '@/lib/logger/mcp-logger';
import { McpOperation } from '@/lib/logger/types';
import { LogSource } from '@/lib/logger/constants';
import type { 
  ServerConfigEntry, 
  MCPToolSet, 
  AISDKToolCollection,
  EnhancedStdioConfig, 
  EnhancedSSEConfig, 
  EnhancedStreamableHTTPConfig
} from './types';
import { MCPClientError } from './types';
import { v4 as uuidv4 } from 'uuid';
import { globalMetricsCollector } from './metrics-collector';
import { createMCPClientFromConfig } from './client-factory';
import { validateServerConfig } from './config';
import { z } from 'zod';

/**
 * Managed MCP Client that handles the lifecycle of an MCP client, including initialization,
 * retries, tool fetching, and status reporting.
 */
export class ManagedMCPClient {
  private readonly logger: ContextualLogMethods;
  private clientInitializationStatus: 'pending' | 'success' | 'error' = 'pending';
  private clientInitializationError?: Error;
  private enhancedClient: MCPToolSet | null = null;
  public readonly config: ServerConfigEntry;
  public readonly displayName: string;
  public readonly serverKey: string;
  private initializationPromise: Promise<void> | null = null;
  private static readonly MAX_RETRIES = 3;
  private static readonly INITIAL_RETRY_DELAY_MS = 1000;
  private static readonly HEALTH_CHECK_INTERVAL_MS = 30000; // 30 seconds
  private static readonly MAX_HEALTH_CHECK_FAILURES = 3;
  private healthCheckTimerId: NodeJS.Timeout | null = null;
  private healthCheckFailures: number = 0;

  constructor(config: ServerConfigEntry, serverKey: string) {
    this.config = config;
    this.serverKey = serverKey;
    this.displayName = config.label || serverKey;
    // Ensure serverKey is a string for correlationId, or generate one if undefined
    const correlationId = this.serverKey || uuidv4();
    const contextualLogger = appLogger.withContext({ correlationId, source: LogSource.MCP });
    this.logger = contextualLogger;

    // Log transport type only if transport is defined, to avoid runtime error if config is malformed initially
    mcpLogger.logServerLifecycle(McpOperation.SERVER_STARTUP, this.serverKey, {
      metadata: {
        transport: this.config.transport?.type || 'unknown',
        label: this.displayName,
      }
    });
    this.initializeClient();
  }

  private initializeClient(): Promise<void> {
    // Perform initial config validation before attempting to connect
    try {
      validateServerConfig(this.config);
      mcpLogger.logServerLifecycle(McpOperation.VALIDATE_CONFIG, this.serverKey, { metadata: { status: 'success', config: this.config } });
    } catch (validationError: unknown) {
      this.clientInitializationStatus = 'error';
      this.clientInitializationError = validationError instanceof Error ? validationError : new Error(String(validationError));
      this.logger.error(
        `[MCP-${this.displayName}] Initial configuration validation failed. Server will not be initialized.`,
        this.clientInitializationError,
        { serverKey: this.serverKey }
      );
      mcpLogger.logServerLifecycle(McpOperation.VALIDATE_CONFIG, this.serverKey, {
        error: this.clientInitializationError,
        metadata: { status: 'failure', config: this.config }
      });
      // Ensure initializationPromise reflects this permanent failure
      this.initializationPromise = Promise.reject(this.clientInitializationError);
      return this.initializationPromise;
    }

    if (!this.initializationPromise) {
      this.initializationPromise = this._attemptInitializationWithRetries().catch(
        (error) => {
          // This catch is for the final error after all retries
          this.clientInitializationStatus = 'error';
          const finalError = error instanceof Error ? error : new Error(String(error));
          this.clientInitializationError = finalError;
          this.logger.error(
            `[MCP-${this.displayName}] Final initialization attempt failed after retries.`,
            finalError,
            { serverKey: this.serverKey } // Meta object is the third argument for error
          );
          mcpLogger.logServerLifecycle(
            McpOperation.ERROR_HANDLING,
            this.serverKey,
            { error: error instanceof Error ? error : new Error(String(error)), metadata: { context: 'Final initialization attempt failed' } }
          );
          // Do not re-throw here, allow status to be checked
        }
      );
    }
    return this.initializationPromise;
  }

  private async _attemptInitializationWithRetries(): Promise<void> {
    for (let attempt = 1; attempt <= ManagedMCPClient.MAX_RETRIES; attempt++) {
      try {
        // Logging transport type here can be problematic if transport is not yet guaranteed.
        // It's safer to log this detail inside _initializeAndFetchTools after validation.
        this.logger.info(
          `[MCP-${this.displayName}] Attempting to initialize client (Attempt ${attempt}/${ManagedMCPClient.MAX_RETRIES}).`,
          { serverKey: this.serverKey, attempt }
        );
        // MCP Logger also should be careful about accessing this.config.transport directly here.
        // It's better to pass specific, validated details if needed.
        mcpLogger.logServerLifecycle(
          McpOperation.INITIALIZE,
          this.serverKey,
          { metadata: { attempt, stage: 'attempt' } } // Removed direct transport access
        );

        await this._initializeAndFetchTools(); // Call the method that does the actual work

        this.clientInitializationStatus = 'success';
        this.clientInitializationError = undefined;
        this.logger.info(
          `[MCP-${this.displayName}] Client initialized successfully with ${this.enhancedClient?.tools ? Object.keys(this.enhancedClient.tools).length : 0} tools.`,
          { serverKey: this.serverKey, toolCount: this.enhancedClient?.tools ? Object.keys(this.enhancedClient.tools).length : 0 }
        );
        mcpLogger.logServerLifecycle(
          McpOperation.INITIALIZE,
          this.serverKey,
          { metadata: { toolCount: this.enhancedClient?.tools ? Object.keys(this.enhancedClient.tools).length : 0, stage: 'success' } }
        );
        
        // Record successful connection with metrics collector
        // Ensure this.config.transport is non-null before accessing its properties
        if (this.config.transport) {
          await globalMetricsCollector.recordServerConnection(
            this.serverKey,
            this.displayName,
            this.config.transport.type as 'stdio' | 'sse' | 'streamable-http',
            this.enhancedClient?.tools ? Object.keys(this.enhancedClient.tools).length : 0,
            { transportDetails: this.config.transport }
          );
        } else {
            // This case should ideally not be reached if initialization was successful
            this.logger.warn(`[MCP-${this.displayName}] Transport configuration missing after successful initialization. Metrics may be incomplete.`);
        }

        this._startHealthChecks(); // Start health checks on successful initialization
        
        return; // Success
      } catch (error: unknown) {
        const attemptError = error instanceof Error ? error : new Error(String(error));
        this.logger.warn(
          `[MCP-${this.displayName}] Initialization attempt ${attempt} failed.`,
          { error: attemptError, serverKey: this.serverKey, attempt }
        );
        this.clientInitializationError = attemptError; // Store last error
        const currentError = error instanceof Error ? error : new Error(String(error));
        mcpLogger.logServerLifecycle(
          McpOperation.ERROR_HANDLING,
          this.serverKey,
          { error: currentError, metadata: { attempt, context: 'Initialization attempt failed' } }
        );

        if (attempt === ManagedMCPClient.MAX_RETRIES) {
          throw error; // Rethrow to be caught by the caller of _attemptInitializationWithRetries
        }
        const delay = ManagedMCPClient.INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
        this.logger.info(`[MCP-${this.displayName}] Retrying in ${delay}ms...`, { serverKey: this.serverKey, attempt, delay });
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    // Should not be reached if MAX_RETRIES > 0
    throw new MCPClientError(`[MCP-${this.displayName}] Exhausted all retries but did not initialize or throw final error.`);
  }

  private async _initializeAndFetchTools(): Promise<void> {
    if (!this.config) {
      throw new MCPClientError(`[MCP-${this.displayName}] Configuration is missing or invalid.`);
    }

    // Log initial attempt, transport might be undefined before validation
    this.logger.info(`[MCP-${this.displayName}] Initializing and fetching tools (inner method)...`, {
      serverKey: this.serverKey,
      transportType: this.config.transport?.type, 
    });

    const validationResult = validateServerConfig(this.config);
    if (!validationResult.valid) {
      const errorMsg = `[MCP-${this.displayName}] Invalid server configuration: ${validationResult.errors.join(', ')}`;
      // Use this.logger for general errors, mcpLogger for specific MCP lifecycle events
      this.logger.error(errorMsg, undefined, { config: this.config }); 
      // Optionally, also log with mcpLogger if it's a server lifecycle failure event
      mcpLogger.logServerLifecycle(McpOperation.ERROR_HANDLING, this.serverKey, { error: new MCPClientError(errorMsg), metadata: { context: 'Invalid server configuration' }});
      throw new MCPClientError(errorMsg);
    }

    if (!this.config.transport) {
      const errorMsg = `[MCP-${this.displayName}] Transport configuration is missing after validation. This indicates a critical issue if normalization was expected to guarantee it.`;
      this.logger.error(errorMsg, undefined, { config: this.config }); 
      mcpLogger.logServerLifecycle(McpOperation.ERROR_HANDLING, this.serverKey, { error: new MCPClientError(errorMsg), metadata: { context: 'Transport configuration missing post-validation' }});
      throw new MCPClientError(errorMsg);
    }

    // At this point, this.config.transport is guaranteed to be non-null due to the check above.
    const transportConfig = this.config.transport;

    let clientSpecificConfig: EnhancedStdioConfig | EnhancedSSEConfig | EnhancedStreamableHTTPConfig;

    // Source these directly from transportConfig as they are not top-level on ServerConfigEntry
    const clientName = transportConfig.clientName;
    const timeout = transportConfig.timeout;
    const onUncaughtError = transportConfig.onUncaughtError;

    switch (transportConfig.type) {
      case 'stdio':
        clientSpecificConfig = {
          ...transportConfig, 
          clientName,
          logger: this.logger!, 
          timeout,
          onUncaughtError,
        };
        break;
      case 'sse':
        clientSpecificConfig = {
          ...transportConfig, 
          clientName,
          logger: this.logger!,
          timeout,
          onUncaughtError,
        };
        break;
      case 'streamable-http':
        clientSpecificConfig = {
          ...transportConfig, 
          clientName,
          logger: this.logger!,
          timeout,
          onUncaughtError,
        };
        break;
      default:
        // This line ensures that if new transport types are added to the union 
        // EnhancedTransportConfig without updating this switch, TypeScript will error.
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const _exhaustiveCheck: never = transportConfig; 
        const actualType = (transportConfig as { type?: string }).type || 'unknown';
        throw new MCPClientError(
          `[MCP-${this.displayName}] Unhandled transport type: ${actualType}`
        );
    }

    this.enhancedClient = await createMCPClientFromConfig(this.serverKey, clientSpecificConfig);
    
    // After client creation, ensure tools are present
    if (!this.enhancedClient || !this.enhancedClient.tools) {
      throw new MCPClientError(`[MCP-${this.displayName}] Client created but failed to provide tools.`);
    }

    // No explicit mcpLogger.info for success here, it's handled by _attemptInitializationWithRetries
    // No globalMetricsCollector.recordInitializationSuccess here, handled by _attemptInitializationWithRetries
  }

  public async getStatus(): Promise<{
    status: 'pending' | 'success' | 'error' | 'initializing';
    error?: string;
    toolsCount?: number;
    displayName: string;
    serverKey: string;
    transportType: string;
  }> {
    // Ensure initialization is triggered if pending and not yet started
    if (this.clientInitializationStatus === 'pending' && !this.initializationPromise) {
      this.initializeClient(); // Start initialization
    }

    // If initializationPromise exists, it means we are initializing or have finished/failed
    if (this.initializationPromise) {
      try {
        await this.initializationPromise; // Wait for current attempt to resolve/reject
      } catch {
        // Error is already handled and status set by initializeClient's catch block
      }
    }
    
    return {
      status: this.clientInitializationStatus === 'pending' && this.initializationPromise ? 'initializing' : this.clientInitializationStatus,
      error: this.clientInitializationError?.message,
      toolsCount: this.enhancedClient?.tools ? Object.keys(this.enhancedClient.tools).length : 0,
      displayName: this.displayName,
      serverKey: this.serverKey,
      // Ensure transport is defined before accessing type, provide a fallback if not (though status would likely be 'error')
      transportType: this.config.transport?.type || 'unknown',
    };
  }

  public async getTools(): Promise<AISDKToolCollection | null> {
    await this.initializationPromise; // Ensure initialization is complete
    if (this.clientInitializationStatus === 'success' && this.enhancedClient) {
      return this.enhancedClient.tools;
    }
    return null;
  }

  public async getTypedTools<T extends Record<string, z.ZodSchema>>(
    schemas: T
  ): Promise<T | null> {
    await this.initializationPromise; // Ensure initialization is complete
    if (this.clientInitializationStatus === 'success' && this.enhancedClient) {
      if ('typedTools' in this.enhancedClient && this.enhancedClient.typedTools) {
        // Client has pre-existing typedTools.
        // Log that the provided 'schemas' parameter is noted but existing typedTools are preferred.
        if (schemas && Object.keys(schemas).length > 0) {
          this.logger.debug(`[MCP-${this.displayName}] getTypedTools: Client has pre-existing typedTools. Provided 'schemas' parameter will be noted but existing typedTools are generally preferred.`, { serverKey: this.serverKey });
        }
        return this.enhancedClient.typedTools as T; // Return existing typedTools
      }
      // Client is not pre-typed. Attempt to use the provided 'schemas'.
      this.logger.info(`[MCP-${this.displayName}] getTypedTools: Client not pre-typed. Attempting to apply and validate provided schemas.`, { serverKey: this.serverKey });
      try {
        // Validate the client's tools against the provided 'schemas'.
        await this.validateToolsAgainstSchemas(this.enhancedClient.tools, schemas);
        // If validation passes, return the provided 'schemas' as the typed representation.
        return schemas;
      } catch (e: unknown) {
        const validationError = e instanceof Error ? e : new Error(String(e));
        this.logger.error(`[MCP-${this.displayName}] Failed to validate tools against provided schemas in getTypedTools.`, validationError, { serverKey: this.serverKey });
        return null; // Validation failed
      }
    }
    return null;
  }

  private async validateToolsAgainstSchemas<T extends Record<string, z.ZodSchema>>(
    tools: AISDKToolCollection,
    schemas: T
  ): Promise<void> {
    // Basic validation - just check if tools exist for provided schemas
    for (const schemaName of Object.keys(schemas)) {
      if (!(schemaName in tools)) {
        throw new Error(`Tool '${schemaName}' not found in available tools`);
      }
    }
    // More comprehensive validation would go here
  }

  public async close(): Promise<void> {
    if (this.initializationPromise) {
      try {
        await this.initializationPromise; // Wait for any ongoing initialization
      } catch (_e: unknown) {
        const closeError = _e instanceof Error ? _e : new Error(String(_e));
        // Initialization failed, client might not exist or be in a bad state
        this.logger.warn(`[MCP-${this.displayName}] Closing client after initialization failure.`, { error: closeError, serverKey: this.serverKey });
      }
    }

    if (this.enhancedClient && this.enhancedClient.close) {
      try {
        await this.enhancedClient.close();
        this.logger.info(`[MCP-${this.displayName}] Client closed successfully.`, { serverKey: this.serverKey });
        mcpLogger.logServerLifecycle(McpOperation.SERVER_SHUTDOWN, this.serverKey);
        await globalMetricsCollector.recordServerDisconnection(this.serverKey);
      } catch (error: unknown) {
        const clientCloseError = error instanceof Error ? error : new Error(String(error));
        this.logger.error(`[MCP-${this.displayName}] Error closing client:`, clientCloseError, { serverKey: this.serverKey });
        mcpLogger.logServerLifecycle(McpOperation.ERROR_HANDLING, this.serverKey, {
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { context: 'Error during server shutdown' }
        });
        await globalMetricsCollector.recordServerError(this.serverKey);
      }
    }
    this.clientInitializationStatus = 'pending'; // Reset status
    this.enhancedClient = null;
    this.initializationPromise = null; // Allow re-initialization
    this._stopHealthChecks();
  }

  private _startHealthChecks(): void {
    this._stopHealthChecks(); // Clear any existing timer
    if (this.enhancedClient && typeof this.enhancedClient.healthCheck === 'function') {
      this.logger.info(`[MCP-${this.displayName}] Starting health checks. Interval: ${ManagedMCPClient.HEALTH_CHECK_INTERVAL_MS}ms`, { serverKey: this.serverKey, interval: ManagedMCPClient.HEALTH_CHECK_INTERVAL_MS });
      this.healthCheckFailures = 0;
      this.healthCheckTimerId = setInterval(
        () => this._performHealthCheck(),
        ManagedMCPClient.HEALTH_CHECK_INTERVAL_MS
      );
    } else {
      this.logger.debug(`[MCP-${this.displayName}] Health checks not started: client does not support healthCheck method.`, { serverKey: this.serverKey });
    }
  }

  private _stopHealthChecks(): void {
    if (this.healthCheckTimerId) {
      clearInterval(this.healthCheckTimerId);
      this.healthCheckTimerId = null;
      this.logger.info(`[MCP-${this.displayName}] Stopped health checks.`, { serverKey: this.serverKey });
    }
  }

  private async _performHealthCheck(): Promise<void> {
    if (!this.enhancedClient || typeof this.enhancedClient.healthCheck !== 'function' || this.clientInitializationStatus !== 'success') {
      this.logger.debug(`[MCP-${this.displayName}] Skipping health check: client not ready, not supported, or not in success state.`, { serverKey: this.serverKey, clientStatus: this.clientInitializationStatus });
      // If not in success state but health checks are somehow running, stop them.
      if (this.clientInitializationStatus !== 'success') this._stopHealthChecks();
      return;
    }

    this.logger.debug(`[MCP-${this.displayName}] Performing health check...`, { serverKey: this.serverKey });
    try {
      const isHealthy = await this.enhancedClient.healthCheck();
      if (isHealthy) {
        this.logger.debug(`[MCP-${this.displayName}] Health check successful.`, { serverKey: this.serverKey });
        this.healthCheckFailures = 0; // Reset failures on success
      } else {
        this.healthCheckFailures++;
        this.logger.warn(
          `[MCP-${this.displayName}] Health check failed (Attempt ${this.healthCheckFailures}/${ManagedMCPClient.MAX_HEALTH_CHECK_FAILURES}).`,
          // For warn, metadata is the second argument if no explicit error object
          { serverKey: this.serverKey, failures: this.healthCheckFailures, maxFailures: ManagedMCPClient.MAX_HEALTH_CHECK_FAILURES }
        );
        mcpLogger.logServerLifecycle(McpOperation.HEALTH_CHECK_FAILURE, this.serverKey, {
          metadata: { failures: this.healthCheckFailures, maxFailures: ManagedMCPClient.MAX_HEALTH_CHECK_FAILURES }
        });
        if (this.healthCheckFailures >= ManagedMCPClient.MAX_HEALTH_CHECK_FAILURES) {
          this.logger.error(
            `[MCP-${this.displayName}] Max health check failures reached. Attempting to re-initialize...`,
            undefined,
            { serverKey: this.serverKey, failures: this.healthCheckFailures }
          );
          this._stopHealthChecks(); // Stop checks before re-initializing
          // Close existing client and re-initialize. 
          // The close() method resets initializationPromise, allowing initializeClient() to run fully.
          await this.close(); 
          this.initializeClient(); // This will trigger _attemptInitializationWithRetries
        }
      }
    } catch (error: unknown) {
      this.healthCheckFailures++;
      const healthCheckError = error instanceof Error ? error : new Error(String(error));
      this.logger.error(
        `[MCP-${this.displayName}] Error during health check (Attempt ${this.healthCheckFailures}/${ManagedMCPClient.MAX_HEALTH_CHECK_FAILURES}).`,
        healthCheckError,
        { serverKey: this.serverKey, failures: this.healthCheckFailures, maxFailures: ManagedMCPClient.MAX_HEALTH_CHECK_FAILURES }
      );
      mcpLogger.logServerLifecycle(McpOperation.HEALTH_CHECK_FAILURE, this.serverKey, {
        error: error instanceof Error ? error : new Error(String(error)),
        metadata: { failures: this.healthCheckFailures, maxFailures: ManagedMCPClient.MAX_HEALTH_CHECK_FAILURES }
      });
      if (this.healthCheckFailures >= ManagedMCPClient.MAX_HEALTH_CHECK_FAILURES) {
        this.logger.error(
          `[MCP-${this.displayName}] Max health check failures reached due to error. Attempting to re-initialize...`,
          undefined, // No specific error object directly causing this log, it's a consequence
          { serverKey: this.serverKey, failures: this.healthCheckFailures }
        );
        this._stopHealthChecks();
        await this.close();
        this.initializeClient();
      }
    }
  }
} 