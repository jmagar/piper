import { AsyncLocalStorage } from 'async_hooks';
import { v4 as uuidv4 } from 'uuid';
import { LogContext } from './types';

// AsyncLocalStorage for maintaining context across async operations
const asyncLocalStorage = new AsyncLocalStorage<LogContext>();

// Headers commonly used for correlation IDs
export const CORRELATION_HEADERS = {
  CORRELATION_ID: 'x-correlation-id',
  REQUEST_ID: 'x-request-id',
  TRACE_ID: 'x-trace-id',
} as const;

// Context keys for storing additional context information
export const CONTEXT_KEYS = {
  USER_ID: 'userId',
  SESSION_ID: 'sessionId',
  USER_AGENT: 'userAgent',
  IP_ADDRESS: 'ipAddress',
  ROUTE: 'route',
  METHOD: 'method',
} as const;

/**
 * Correlation ID Manager
 * Handles generation, storage, and retrieval of correlation IDs and request context
 */
export class CorrelationManager {
  private static instance: CorrelationManager;

  private constructor() {}

  public static getInstance(): CorrelationManager {
    if (!CorrelationManager.instance) {
      CorrelationManager.instance = new CorrelationManager();
    }
    return CorrelationManager.instance;
  }

  /**
   * Generate a new correlation ID
   */
  public generateCorrelationId(): string {
    return uuidv4();
  }

  /**
   * Generate a shorter correlation ID for display purposes
   */
  public generateShortCorrelationId(): string {
    return uuidv4().split('-')[0];
  }

  /**
   * Extract correlation ID from headers (supporting multiple header names)
   */
  public extractCorrelationId(headers: Record<string, string | string[] | undefined>): string | undefined {
    // Check common header names for correlation ID
    const headerNames = Object.values(CORRELATION_HEADERS);
    
    for (const headerName of headerNames) {
      const value = headers[headerName] || headers[headerName.toLowerCase()];
      if (value) {
        return Array.isArray(value) ? value[0] : value;
      }
    }
    
    return undefined;
  }

  /**
   * Create a new context with correlation ID and additional metadata
   */
  public createContext(options: {
    correlationId?: string;
    userId?: string;
    requestId?: string;
    sessionId?: string;
    userAgent?: string;
    ip?: string;
    route?: string;
    method?: string;
  }): LogContext {
    return {
      correlationId: options.correlationId || this.generateCorrelationId(),
      userId: options.userId,
      requestId: options.requestId || this.generateCorrelationId(),
      sessionId: options.sessionId,
      userAgent: options.userAgent,
      ip: options.ip,
      route: options.route,
      method: options.method,
    };
  }

  /**
   * Create context from HTTP request-like object
   */
  public createContextFromRequest(request: {
    headers: Record<string, string | string[] | undefined>;
    method?: string;
    url?: string;
    ip?: string;
    user?: { id: string };
  }): LogContext {
    const correlationId = this.extractCorrelationId(request.headers) || this.generateCorrelationId();
    const userAgent = this.extractUserAgent(request.headers);
    
    return this.createContext({
      correlationId,
      userId: request.user?.id,
      userAgent,
      ip: request.ip,
      route: request.url,
      method: request.method,
    });
  }

  /**
   * Run code within a correlation context
   */
  public runWithContext<T>(context: LogContext, callback: () => T): T {
    return asyncLocalStorage.run(context, callback);
  }

  /**
   * Run code within a correlation context (async version)
   */
  public async runWithContextAsync<T>(context: LogContext, callback: () => Promise<T>): Promise<T> {
    return asyncLocalStorage.run(context, callback);
  }

  /**
   * Get the current correlation context
   */
  public getCurrentContext(): LogContext | undefined {
    return asyncLocalStorage.getStore();
  }

  /**
   * Get the current correlation ID
   */
  public getCurrentCorrelationId(): string | undefined {
    const context = this.getCurrentContext();
    return context?.correlationId;
  }

  /**
   * Get the current request ID
   */
  public getCurrentRequestId(): string | undefined {
    const context = this.getCurrentContext();
    return context?.requestId;
  }

  /**
   * Get the current user ID
   */
  public getCurrentUserId(): string | undefined {
    const context = this.getCurrentContext();
    return context?.userId;
  }

  /**
   * Update the current context with additional information
   */
  public updateContext(updates: Partial<LogContext>): void {
    const currentContext = this.getCurrentContext();
    if (currentContext) {
      Object.assign(currentContext, updates);
    }
  }

  /**
   * Set user ID in the current context
   */
  public setUserId(userId: string): void {
    this.updateContext({ userId });
  }

  /**
   * Set session ID in the current context
   */
  public setSessionId(sessionId: string): void {
    this.updateContext({ sessionId });
  }

  /**
   * Create headers object with correlation ID for outgoing requests
   */
  public createOutgoingHeaders(additionalHeaders: Record<string, string> = {}): Record<string, string> {
    const context = this.getCurrentContext();
    const headers: Record<string, string> = { ...additionalHeaders };
    
    if (context?.correlationId) {
      headers[CORRELATION_HEADERS.CORRELATION_ID] = context.correlationId;
    }
    
    if (context?.requestId) {
      headers[CORRELATION_HEADERS.REQUEST_ID] = context.requestId;
    }
    
    return headers;
  }

  /**
   * Extract user agent from headers
   */
  private extractUserAgent(headers: Record<string, string | string[] | undefined>): string | undefined {
    const userAgent = headers['user-agent'] || headers['User-Agent'];
    return Array.isArray(userAgent) ? userAgent[0] : userAgent;
  }

  /**
   * Validate correlation ID format
   */
  public isValidCorrelationId(correlationId: string): boolean {
    // UUID v4 format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(correlationId);
  }

  /**
   * Sanitize correlation ID to prevent log injection
   */
  public sanitizeCorrelationId(correlationId: string): string {
    // Remove any non-alphanumeric characters except hyphens
    return correlationId.replace(/[^a-zA-Z0-9-]/g, '').substring(0, 36);
  }

  /**
   * Get context summary for logging
   */
  public getContextSummary(): Record<string, unknown> {
    const context = this.getCurrentContext();
    if (!context) {
      return {};
    }

    return {
      correlationId: context.correlationId,
      requestId: context.requestId,
      userId: context.userId,
      route: context.route,
      method: context.method,
    };
  }

  /**
   * Clear the current context (useful for testing)
   */
  public clearContext(): void {
    // Note: AsyncLocalStorage doesn't have a direct clear method
    // This is mainly for testing purposes
    this.runWithContext({
      correlationId: '',
    }, () => {});
  }
}

// Singleton instance
export const correlationManager = CorrelationManager.getInstance();

// Utility functions for easy access
export const getCurrentCorrelationId = () => correlationManager.getCurrentCorrelationId();
export const getCurrentRequestId = () => correlationManager.getCurrentRequestId();
export const getCurrentUserId = () => correlationManager.getCurrentUserId();
export const getCurrentContext = () => correlationManager.getCurrentContext();
export const generateCorrelationId = () => correlationManager.generateCorrelationId();
export const createOutgoingHeaders = (headers?: Record<string, string>) => 
  correlationManager.createOutgoingHeaders(headers);

// Higher-order function for wrapping functions with correlation context
export function withCorrelation<T extends (...args: any[]) => any>(
  fn: T,
  context?: LogContext
): T {
  return ((...args: Parameters<T>) => {
    const currentContext = correlationManager.getCurrentContext();
    const contextToUse = context || currentContext;
    
    if (contextToUse) {
      return correlationManager.runWithContext(contextToUse, () => fn(...args));
    }
    
    return fn(...args);
  }) as T;
}

// Async version of withCorrelation
export function withCorrelationAsync<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context?: LogContext
): T {
  return (async (...args: Parameters<T>) => {
    const currentContext = correlationManager.getCurrentContext();
    const contextToUse = context || currentContext;
    
    if (contextToUse) {
      return correlationManager.runWithContextAsync(contextToUse, () => fn(...args));
    }
    
    return fn(...args);
  }) as T;
}

// Default export
export default correlationManager; 