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
  EnhancedStreamableHTTPConfig,
  CircuitBreakerState,
  RetryConfig,
  SchemaDefinition
} from './types';
import { MCPClientError } from './types';
import { v4 as uuidv4 } from 'uuid';
import { globalMetricsCollector } from './metrics-collector';
import { createMCPClientFromConfig } from './client-factory';
import { validateServerConfig } from './config';
import { z } from 'zod';

// Enhanced health check result interface
export interface HealthCheckResult {
  healthy: boolean;
  latency?: number;
  circuitBreakerState?: CircuitBreakerState;
  lastError?: string;
  consecutiveFailures: number;
  metadata?: Record<string, unknown>;
}

// Enhanced initialization options
export interface ManagedClientOptions {
  schemas?: Record<string, SchemaDefinition>;
  retryConfig?: RetryConfig;
  healthCheckConfig?: {
    enabled?: boolean;
    intervalMs?: number;
    timeoutMs?: number;
    maxFailures?: number;
  };
  enableCircuitBreaker?: boolean;
  enableGracefulDegradation?: boolean;
}

/**
 * Enhanced Managed MCP Client with schema-first tool registration, circuit breaker integration,
 * and advanced health monitoring capabilities
 */
export class ManagedMCPClient {
  private readonly logger: ContextualLogMethods;
  private clientInitializationStatus: 'pending' | 'success' | 'error' | 'degraded' = 'pending';
  private clientInitializationError?: Error;
  private enhancedClient: MCPToolSet | null = null;
  public readonly config: ServerConfigEntry;
  public readonly displayName: string;
  public readonly serverKey: string;
  public readonly options: ManagedClientOptions;
  private initializationPromise: Promise<void> | null = null;
  
  // Enhanced configuration
  private static readonly MAX_RETRIES = 3;
  private static readonly INITIAL_RETRY_DELAY_MS = 1000;
  private static readonly HEALTH_CHECK_INTERVAL_MS = 30000; // 30 seconds
  private static readonly MAX_HEALTH_CHECK_FAILURES = 3;
  private static readonly HEALTH_CHECK_TIMEOUT_MS = 10000; // 10 seconds
  
  // Enhanced state management
  private healthCheckTimerId: NodeJS.Timeout | null = null;
  private healthCheckFailures: number = 0;
  private lastHealthCheckResult: HealthCheckResult | null = null;
  private circuitBreakerState: CircuitBreakerState = 'CLOSED';
  private gracefulDegradationActive = false;
  private toolSchemas: Record<string, SchemaDefinition> = {};

  constructor(
    config: ServerConfigEntry, 
    serverKey: string, 
    options: ManagedClientOptions = {}
  ) {
    this.config = config;
    this.serverKey = serverKey;
    this.displayName = config.label || serverKey;
    this.options = {
      enableCircuitBreaker: true,
      enableGracefulDegradation: true,
      healthCheckConfig: {
        enabled: true,
        intervalMs: ManagedMCPClient.HEALTH_CHECK_INTERVAL_MS,
        timeoutMs: ManagedMCPClient.HEALTH_CHECK_TIMEOUT_MS,
        maxFailures: ManagedMCPClient.MAX_HEALTH_CHECK_FAILURES
      },
      ...options
    };

    // Store schemas for enhanced tool registration
    if (options.schemas) {
      this.toolSchemas = options.schemas;
    }

    // Ensure serverKey is a string for correlationId, or generate one if undefined
    const correlationId = this.serverKey || uuidv4();
    const contextualLogger = appLogger.withContext({ correlationId, source: LogSource.MCP });
    this.logger = contextualLogger;

    // Enhanced startup logging with schema information
    mcpLogger.logServerLifecycle(McpOperation.SERVER_STARTUP, this.serverKey, {
      metadata: {
        transport: this.config.transport?.type || 'unknown',
        label: this.displayName,
        hasSchemas: Object.keys(this.toolSchemas).length > 0,
        schemaCount: Object.keys(this.toolSchemas).length,
        circuitBreakerEnabled: this.options.enableCircuitBreaker,
        gracefulDegradationEnabled: this.options.enableGracefulDegradation
      }
    });
    
    this.initializeClient();
  }

  private initializeClient(): Promise<void> {
    // Perform initial config validation before attempting to connect
    try {
      validateServerConfig(this.config);
      mcpLogger.logServerLifecycle(McpOperation.VALIDATE_CONFIG, this.serverKey, { 
        metadata: { 
          status: 'success', 
          config: this.config,
          hasSchemas: Object.keys(this.toolSchemas).length > 0
        } 
      });
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
          // Enhanced error handling with graceful degradation
          this.clientInitializationStatus = this.options.enableGracefulDegradation ? 'degraded' : 'error';
          const finalError = error instanceof Error ? error : new Error(String(error));
          this.clientInitializationError = finalError;
          
          if (this.options.enableGracefulDegradation) {
            this.gracefulDegradationActive = true;
            this.logger.warn(
              `[MCP-${this.displayName}] Initialization failed, entering graceful degradation mode.`,
              finalError,
              { serverKey: this.serverKey, degradationActive: true }
            );
          } else {
            this.logger.error(
              `[MCP-${this.displayName}] Final initialization attempt failed after retries.`,
              finalError,
              { serverKey: this.serverKey }
            );
          }
          
          mcpLogger.logServerLifecycle(
            McpOperation.ERROR_HANDLING,
            this.serverKey,
            { 
              error: error instanceof Error ? error : new Error(String(error)), 
              metadata: { 
                context: 'Final initialization attempt failed',
                gracefulDegradationActive: this.gracefulDegradationActive
              } 
            }
          );
        }
      );
    }
    return this.initializationPromise;
  }

  private async _attemptInitializationWithRetries(): Promise<void> {
    const retryConfig = this.options.retryConfig || {
      maxRetries: ManagedMCPClient.MAX_RETRIES,
      baseDelayMs: ManagedMCPClient.INITIAL_RETRY_DELAY_MS,
      maxDelayMs: 30000,
      backoffMultiplier: 2
    };

    for (let attempt = 1; attempt <= (retryConfig.maxRetries || ManagedMCPClient.MAX_RETRIES); attempt++) {
      try {
        this.logger.info(
          `[MCP-${this.displayName}] Attempting to initialize client (Attempt ${attempt}/${retryConfig.maxRetries || ManagedMCPClient.MAX_RETRIES}).`,
          { 
            serverKey: this.serverKey, 
            attempt,
            hasSchemas: Object.keys(this.toolSchemas).length > 0,
            circuitBreakerState: this.circuitBreakerState
          }
        );
        
        mcpLogger.logServerLifecycle(
          McpOperation.INITIALIZE,
          this.serverKey,
          { metadata: { attempt, stage: 'attempt', schemaCount: Object.keys(this.toolSchemas).length } }
        );

        await this._initializeAndFetchTools();

        this.clientInitializationStatus = 'success';
        this.clientInitializationError = undefined;
        this.circuitBreakerState = 'CLOSED';
        this.gracefulDegradationActive = false;
        
        const toolCount = this.enhancedClient?.tools ? Object.keys(this.enhancedClient.tools).length : 0;
        
        this.logger.info(
          `[MCP-${this.displayName}] Client initialized successfully with ${toolCount} tools.`,
          { 
            serverKey: this.serverKey, 
            toolCount,
            schemaCount: Object.keys(this.toolSchemas).length,
            circuitBreakerState: this.circuitBreakerState
          }
        );
        
        mcpLogger.logServerLifecycle(
          McpOperation.INITIALIZE,
          this.serverKey,
          { 
            metadata: { 
              toolCount, 
              stage: 'success',
              schemaCount: Object.keys(this.toolSchemas).length,
              circuitBreakerState: this.circuitBreakerState
            } 
          }
        );
        
        // Record successful connection with enhanced metrics
        if (this.config.transport) {
          await globalMetricsCollector.recordServerConnection(
            this.serverKey,
            this.displayName,
            this.config.transport.type as 'stdio' | 'sse' | 'streamable-http',
            toolCount,
            { 
              transportDetails: this.config.transport,
              schemaCount: Object.keys(this.toolSchemas).length,
              circuitBreakerEnabled: this.options.enableCircuitBreaker,
              gracefulDegradationEnabled: this.options.enableGracefulDegradation
            }
          );
        } else {
          this.logger.warn(`[MCP-${this.displayName}] Transport configuration missing after successful initialization. Metrics may be incomplete.`);
        }

        this._startEnhancedHealthChecks();
        
        return; // Success
      } catch (error: unknown) {
        const attemptError = error instanceof Error ? error : new Error(String(error));
        this.logger.warn(
          `[MCP-${this.displayName}] Initialization attempt ${attempt} failed.`,
          { error: attemptError, serverKey: this.serverKey, attempt }
        );
        this.clientInitializationError = attemptError;
        
        // Update circuit breaker state on failures
        if (this.options.enableCircuitBreaker) {
          this.circuitBreakerState = attempt >= (retryConfig.maxRetries || ManagedMCPClient.MAX_RETRIES) ? 'OPEN' : 'HALF_OPEN';
        }
        
        const currentError = error instanceof Error ? error : new Error(String(error));
        mcpLogger.logServerLifecycle(
          McpOperation.ERROR_HANDLING,
          this.serverKey,
          { 
            error: currentError, 
            metadata: { 
              attempt, 
              context: 'Initialization attempt failed',
              circuitBreakerState: this.circuitBreakerState
            } 
          }
        );

        if (attempt === (retryConfig.maxRetries || ManagedMCPClient.MAX_RETRIES)) {
          throw error;
        }
        
        // Enhanced retry delay calculation
        const delay = Math.min(
          (retryConfig.baseDelayMs || ManagedMCPClient.INITIAL_RETRY_DELAY_MS) * Math.pow(retryConfig.backoffMultiplier || 2, attempt - 1),
          retryConfig.maxDelayMs || 30000
        );
        
        this.logger.info(`[MCP-${this.displayName}] Retrying in ${delay}ms...`, { serverKey: this.serverKey, attempt, delay });
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    throw new MCPClientError(`[MCP-${this.displayName}] Exhausted all retries but did not initialize or throw final error.`);
  }

  private async _initializeAndFetchTools(): Promise<void> {
    if (!this.config) {
      throw new MCPClientError(`[MCP-${this.displayName}] Configuration is missing or invalid.`);
    }

    this.logger.info(`[MCP-${this.displayName}] Initializing and fetching tools (inner method)...`, {
      serverKey: this.serverKey,
      transportType: this.config.transport?.type,
      schemaCount: Object.keys(this.toolSchemas).length
    });

    const validationResult = validateServerConfig(this.config);
    if (!validationResult.valid) {
      const errorMsg = `[MCP-${this.displayName}] Invalid server configuration: ${validationResult.errors.join(', ')}`;
      this.logger.error(errorMsg, undefined, { config: this.config }); 
      mcpLogger.logServerLifecycle(McpOperation.ERROR_HANDLING, this.serverKey, { error: new MCPClientError(errorMsg), metadata: { context: 'Invalid server configuration' }});
      throw new MCPClientError(errorMsg);
    }

    if (!this.config.transport) {
      const errorMsg = `[MCP-${this.displayName}] Transport configuration is missing after validation. This indicates a critical issue if normalization was expected to guarantee it.`;
      this.logger.error(errorMsg, undefined, { config: this.config }); 
      mcpLogger.logServerLifecycle(McpOperation.ERROR_HANDLING, this.serverKey, { error: new MCPClientError(errorMsg), metadata: { context: 'Transport configuration missing post-validation' }});
      throw new MCPClientError(errorMsg);
    }

    const transportConfig = this.config.transport;

    let clientSpecificConfig: (EnhancedStdioConfig | EnhancedSSEConfig | EnhancedStreamableHTTPConfig) & {
      schemas?: Record<string, SchemaDefinition>;
      retryConfig?: RetryConfig;
      timeoutMs?: number;
    };

    const clientName = transportConfig.clientName;
    const timeout = transportConfig.timeout;
    const onUncaughtError = transportConfig.onUncaughtError;

    // Enhanced configuration with schema support
    const enhancedTransportConfig = {
      ...transportConfig,
      clientName,
      logger: this.logger!,
      timeout,
      onUncaughtError,
      schemas: Object.keys(this.toolSchemas).length > 0 ? this.toolSchemas : undefined,
      retryConfig: this.options.retryConfig,
      timeoutMs: this.options.healthCheckConfig?.timeoutMs || ManagedMCPClient.HEALTH_CHECK_TIMEOUT_MS
    };

    switch (transportConfig.type) {
      case 'stdio':
        clientSpecificConfig = enhancedTransportConfig;
        break;
      case 'sse':
        clientSpecificConfig = enhancedTransportConfig;
        break;
      case 'streamable-http':
        clientSpecificConfig = enhancedTransportConfig;
        break;
      default:
        const _exhaustiveCheck: never = transportConfig; 
        const actualType = (transportConfig as { type?: string }).type || 'unknown';
        throw new MCPClientError(
          `[MCP-${this.displayName}] Unhandled transport type: ${actualType}`
        );
    }

    this.enhancedClient = await createMCPClientFromConfig(this.serverKey, clientSpecificConfig);
    
    // Enhanced validation with schema checking
    if (!this.enhancedClient || !this.enhancedClient.tools) {
      throw new MCPClientError(`[MCP-${this.displayName}] Client created but failed to provide tools.`);
    }

    // Validate tools against schemas if provided
    if (Object.keys(this.toolSchemas).length > 0) {
      await this.validateToolsAgainstSchemas(this.enhancedClient.tools, this.toolSchemas);
      this.logger.info(`[MCP-${this.displayName}] Schema validation completed successfully for ${Object.keys(this.toolSchemas).length} tool schemas.`, {
        serverKey: this.serverKey,
        schemaCount: Object.keys(this.toolSchemas).length
      });
    }
  }

  public async getStatus(): Promise<{
    status: 'pending' | 'success' | 'error' | 'initializing' | 'degraded';
    error?: string;
    toolsCount?: number;
    displayName: string;
    serverKey: string;
    transportType: string;
    circuitBreakerState?: CircuitBreakerState;
    gracefulDegradationActive?: boolean;
         lastHealthCheck?: HealthCheckResult | null;
    schemaCount?: number;
  }> {
    if (this.clientInitializationStatus === 'pending' && !this.initializationPromise) {
      this.initializeClient();
    }

    if (this.initializationPromise) {
      try {
        await this.initializationPromise;
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
      transportType: this.config.transport?.type || 'unknown',
      circuitBreakerState: this.circuitBreakerState,
      gracefulDegradationActive: this.gracefulDegradationActive,
      lastHealthCheck: this.lastHealthCheckResult,
      schemaCount: Object.keys(this.toolSchemas).length
    };
  }

  public async getTools(): Promise<AISDKToolCollection | null> {
    await this.initializationPromise;
    if ((this.clientInitializationStatus === 'success' || (this.clientInitializationStatus === 'degraded' && this.gracefulDegradationActive)) && this.enhancedClient) {
      return this.enhancedClient.tools;
    }
    return null;
  }

  public async getTypedTools<T extends Record<string, z.ZodSchema>>(
    schemas: T
  ): Promise<T | null> {
    await this.initializationPromise;
    if ((this.clientInitializationStatus === 'success' || (this.clientInitializationStatus === 'degraded' && this.gracefulDegradationActive)) && this.enhancedClient) {
      if ('typedTools' in this.enhancedClient && this.enhancedClient.typedTools) {
        if (schemas && Object.keys(schemas).length > 0) {
          this.logger.debug(`[MCP-${this.displayName}] getTypedTools: Client has pre-existing typedTools. Provided 'schemas' parameter will be noted but existing typedTools are generally preferred.`, { serverKey: this.serverKey });
        }
        return this.enhancedClient.typedTools as T;
      }
      
      this.logger.info(`[MCP-${this.displayName}] getTypedTools: Client not pre-typed. Attempting to apply and validate provided schemas.`, { serverKey: this.serverKey });
      try {
        await this.validateToolsAgainstSchemas(this.enhancedClient.tools, schemas);
        return schemas;
      } catch (e: unknown) {
        const validationError = e instanceof Error ? e : new Error(String(e));
        this.logger.error(`[MCP-${this.displayName}] Failed to validate tools against provided schemas in getTypedTools.`, validationError);
        return null;
      }
    }
    return null;
  }

  private async validateToolsAgainstSchemas<T extends Record<string, z.ZodSchema>>(
    tools: AISDKToolCollection,
    schemas: T
  ): Promise<void> {
    // Enhanced validation with schema definition support
    for (const [schemaName, schemaDefinition] of Object.entries(schemas)) {
      if (!(schemaName in tools)) {
        throw new Error(`Tool '${schemaName}' not found in available tools`);
      }

      // If schema definition has parameters, we could validate tool structure here
      if (schemaDefinition && typeof schemaDefinition === 'object' && 'parameters' in schemaDefinition) {
        // Additional validation logic would go here
        this.logger.debug(`[MCP-${this.displayName}] Validated schema for tool: ${schemaName}`, {
          serverKey: this.serverKey,
          toolName: schemaName
        });
      }
    }
  }

  public getCircuitBreakerState(): CircuitBreakerState {
    return this.circuitBreakerState;
  }

  public isGracefulDegradationActive(): boolean {
    return this.gracefulDegradationActive;
  }

  public getLastHealthCheck(): HealthCheckResult | null {
    return this.lastHealthCheckResult;
  }

  public async close(): Promise<void> {
    if (this.initializationPromise) {
      try {
        await this.initializationPromise;
      } catch (_e: unknown) {
        const closeError = _e instanceof Error ? _e : new Error(String(_e));
        this.logger.warn(`[MCP-${this.displayName}] Closing client after initialization failure.`, { error: closeError, serverKey: this.serverKey });
      }
    }

    this._stopEnhancedHealthChecks();

    if (this.enhancedClient && this.enhancedClient.close) {
      try {
        await this.enhancedClient.close();
        this.logger.info(`[MCP-${this.displayName}] Client closed successfully.`, { serverKey: this.serverKey });
        mcpLogger.logServerLifecycle(McpOperation.SERVER_SHUTDOWN, this.serverKey);
        await globalMetricsCollector.recordServerDisconnection(this.serverKey);
      } catch (error: unknown) {
        const clientCloseError = error instanceof Error ? error : new Error(String(error));
        this.logger.error(`[MCP-${this.displayName}] Error closing client:`, clientCloseError);
        mcpLogger.logServerLifecycle(McpOperation.ERROR_HANDLING, this.serverKey, {
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { context: 'Error during server shutdown' }
        });
        await globalMetricsCollector.recordServerError(this.serverKey);
      }
    }
    
    // Enhanced cleanup
    this.clientInitializationStatus = 'pending';
    this.enhancedClient = null;
    this.initializationPromise = null;
    this.circuitBreakerState = 'CLOSED';
    this.gracefulDegradationActive = false;
    this.lastHealthCheckResult = null;
    this.healthCheckFailures = 0;
  }

  private _startEnhancedHealthChecks(): void {
    this._stopEnhancedHealthChecks();
    
    if (!this.options.healthCheckConfig?.enabled) {
      this.logger.debug(`[MCP-${this.displayName}] Health checks disabled by configuration.`, { serverKey: this.serverKey });
      return;
    }

    if (this.enhancedClient && typeof this.enhancedClient.healthCheck === 'function') {
      const interval = this.options.healthCheckConfig?.intervalMs || ManagedMCPClient.HEALTH_CHECK_INTERVAL_MS;
      this.logger.info(`[MCP-${this.displayName}] Starting enhanced health checks. Interval: ${interval}ms`, { 
        serverKey: this.serverKey, 
        interval,
        circuitBreakerEnabled: this.options.enableCircuitBreaker
      });
      this.healthCheckFailures = 0;
      this.healthCheckTimerId = setInterval(
        () => this._performEnhancedHealthCheck(),
        interval
      );
    } else {
      this.logger.debug(`[MCP-${this.displayName}] Health checks not started: client does not support healthCheck method.`, { serverKey: this.serverKey });
    }
  }

  private _stopEnhancedHealthChecks(): void {
    if (this.healthCheckTimerId) {
      clearInterval(this.healthCheckTimerId);
      this.healthCheckTimerId = null;
      this.logger.info(`[MCP-${this.displayName}] Stopped enhanced health checks.`, { serverKey: this.serverKey });
    }
  }

  private async _performEnhancedHealthCheck(): Promise<void> {
    if (!this.enhancedClient || typeof this.enhancedClient.healthCheck !== 'function' || this.clientInitializationStatus === 'error') {
      this.logger.debug(`[MCP-${this.displayName}] Skipping health check: client not ready, not supported, or in error state.`, { 
        serverKey: this.serverKey, 
        clientStatus: this.clientInitializationStatus 
      });
      return;
    }

    const startTime = Date.now();
    const timeoutMs = this.options.healthCheckConfig?.timeoutMs || ManagedMCPClient.HEALTH_CHECK_TIMEOUT_MS;
    const maxFailures = this.options.healthCheckConfig?.maxFailures || ManagedMCPClient.MAX_HEALTH_CHECK_FAILURES;

    this.logger.debug(`[MCP-${this.displayName}] Performing enhanced health check...`, { 
      serverKey: this.serverKey,
      circuitBreakerState: this.circuitBreakerState,
      consecutiveFailures: this.healthCheckFailures
    });

    try {
      // Enhanced health check with timeout and circuit breaker state
      const healthCheckPromise = this.enhancedClient.healthCheck();
      const timeoutPromise = new Promise<boolean>((_, reject) => {
        setTimeout(() => reject(new Error(`Health check timed out after ${timeoutMs}ms`)), timeoutMs);
      });

      const isHealthy = await Promise.race([healthCheckPromise, timeoutPromise]);
      const latency = Date.now() - startTime;

      // Get circuit breaker state if available
      const circuitBreakerState = this.enhancedClient.circuitBreakerState ? this.enhancedClient.circuitBreakerState() : this.circuitBreakerState;

      const healthResult: HealthCheckResult = {
        healthy: isHealthy,
        latency,
        circuitBreakerState,
        consecutiveFailures: this.healthCheckFailures,
        metadata: {
          timestamp: new Date().toISOString(),
          serverKey: this.serverKey,
          gracefulDegradationActive: this.gracefulDegradationActive
        }
      };

      if (isHealthy) {
        this.logger.debug(`[MCP-${this.displayName}] Enhanced health check successful (${latency}ms).`, { 
          serverKey: this.serverKey,
          latency,
          circuitBreakerState
        });
        this.healthCheckFailures = 0;
        this.circuitBreakerState = 'CLOSED';
        
        // Exit graceful degradation if active
        if (this.gracefulDegradationActive) {
          this.gracefulDegradationActive = false;
          this.clientInitializationStatus = 'success';
          this.logger.info(`[MCP-${this.displayName}] Exiting graceful degradation mode - health restored.`, {
            serverKey: this.serverKey,
            latency
          });
        }
      } else {
        this.healthCheckFailures++;
        this.circuitBreakerState = this.healthCheckFailures >= maxFailures ? 'OPEN' : 'HALF_OPEN';
        
        healthResult.consecutiveFailures = this.healthCheckFailures;
        healthResult.lastError = 'Health check returned false';

        this.logger.warn(
          `[MCP-${this.displayName}] Enhanced health check failed (Attempt ${this.healthCheckFailures}/${maxFailures}).`,
          { 
            serverKey: this.serverKey, 
            failures: this.healthCheckFailures, 
            maxFailures,
            circuitBreakerState: this.circuitBreakerState,
            latency
          }
        );

        mcpLogger.logServerLifecycle(McpOperation.HEALTH_CHECK_FAILURE, this.serverKey, {
          metadata: { 
            failures: this.healthCheckFailures, 
            maxFailures,
            circuitBreakerState: this.circuitBreakerState,
            latency
          }
        });

        if (this.healthCheckFailures >= maxFailures) {
          await this._handleHealthCheckFailure();
        }
      }

      this.lastHealthCheckResult = healthResult;

    } catch (error: unknown) {
      const latency = Date.now() - startTime;
      this.healthCheckFailures++;
      this.circuitBreakerState = this.healthCheckFailures >= maxFailures ? 'OPEN' : 'HALF_OPEN';
      
      const healthCheckError = error instanceof Error ? error : new Error(String(error));
      
      const healthResult: HealthCheckResult = {
        healthy: false,
        latency,
        circuitBreakerState: this.circuitBreakerState,
        consecutiveFailures: this.healthCheckFailures,
        lastError: healthCheckError.message,
        metadata: {
          timestamp: new Date().toISOString(),
          serverKey: this.serverKey,
          errorType: healthCheckError.name
        }
      };

      this.lastHealthCheckResult = healthResult;

      this.logger.error(
        `[MCP-${this.displayName}] Error during enhanced health check (Attempt ${this.healthCheckFailures}/${maxFailures}).`,
        healthCheckError,
        { 
          serverKey: this.serverKey, 
          failures: this.healthCheckFailures, 
          maxFailures,
          circuitBreakerState: this.circuitBreakerState,
          latency
        }
      );

      mcpLogger.logServerLifecycle(McpOperation.HEALTH_CHECK_FAILURE, this.serverKey, {
        error: healthCheckError,
        metadata: { 
          failures: this.healthCheckFailures, 
          maxFailures,
          circuitBreakerState: this.circuitBreakerState,
          latency
        }
      });

      if (this.healthCheckFailures >= maxFailures) {
        await this._handleHealthCheckFailure();
      }
    }
  }

  private async _handleHealthCheckFailure(): Promise<void> {
    if (this.options.enableGracefulDegradation && !this.gracefulDegradationActive) {
      // Enter graceful degradation mode instead of full re-initialization
      this.gracefulDegradationActive = true;
      this.clientInitializationStatus = 'degraded';
      this.circuitBreakerState = 'OPEN';
      
      this.logger.warn(
        `[MCP-${this.displayName}] Max health check failures reached. Entering graceful degradation mode.`,
        undefined,
        { 
          serverKey: this.serverKey, 
          failures: this.healthCheckFailures,
          circuitBreakerState: this.circuitBreakerState
        }
      );

      mcpLogger.logServerLifecycle(McpOperation.ERROR_HANDLING, this.serverKey, {
        metadata: { 
          context: 'Entering graceful degradation mode',
          failures: this.healthCheckFailures,
          circuitBreakerState: this.circuitBreakerState
        }
      });

      // Continue health checks but with reduced frequency
      this._stopEnhancedHealthChecks();
      const degradedInterval = (this.options.healthCheckConfig?.intervalMs || ManagedMCPClient.HEALTH_CHECK_INTERVAL_MS) * 2;
      this.healthCheckTimerId = setInterval(
        () => this._performEnhancedHealthCheck(),
        degradedInterval
      );

    } else {
      // Full re-initialization as fallback
      this.logger.error(
        `[MCP-${this.displayName}] Max health check failures reached. Attempting to re-initialize...`,
        undefined,
        { serverKey: this.serverKey, failures: this.healthCheckFailures }
      );
      
      this._stopEnhancedHealthChecks();
      await this.close();
      this.initializeClient();
    }
  }
} 