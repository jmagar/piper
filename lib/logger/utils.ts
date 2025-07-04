import { appLogger } from './index';
import { LogLevel, LogSource } from './constants';

/**
 * Utility functions to reduce logging spam while maintaining essential information
 */

// Track cache operation counts to reduce spam
const cacheLogCounts = new Map<string, { count: number, lastLogged: number }>();
const CACHE_LOG_THROTTLE_MS = 60000; // Log cache operations at most once per minute
const CACHE_LOG_BATCH_SIZE = 10; // Log every 10th cache operation

/**
 * Log cache operations with throttling to reduce spam
 * Only logs every Nth operation or after a time threshold
 */
export function logCacheOperation(
  operation: 'hit' | 'miss' | 'set' | 'clear',
  cacheType: string,
  key: string,
  metadata?: Record<string, unknown>
): void {
  const cacheKey = `${cacheType}:${operation}`;
  const now = Date.now();
  const existing = cacheLogCounts.get(cacheKey);
  
  if (!existing) {
    cacheLogCounts.set(cacheKey, { count: 1, lastLogged: now });
    // Always log the first operation of each type
    appLogger.logSource(LogSource.MCP, LogLevel.DEBUG, 
      `[${cacheType}] Cache ${operation.toUpperCase()} - ${key}`, 
      metadata
    );
    return;
  }
  
  existing.count++;
  const shouldLog = 
    existing.count % CACHE_LOG_BATCH_SIZE === 0 || 
    (now - existing.lastLogged) > CACHE_LOG_THROTTLE_MS;
    
  if (shouldLog) {
    existing.lastLogged = now;
    appLogger.logSource(LogSource.MCP, LogLevel.DEBUG,
      `[${cacheType}] Cache ${operation.toUpperCase()} (${existing.count} ops) - ${key}`,
      metadata
    );
  }
}

/**
 * Log performance metrics only if they exceed thresholds
 */
export function logPerformanceMetric(
  operation: string,
  durationMs: number,
  threshold: number = 1000,
  metadata?: Record<string, unknown>
): void {
  if (durationMs > threshold) {
    appLogger.logSource(LogSource.SYSTEM, LogLevel.WARN,
      `[Performance] ${operation} took ${durationMs}ms (threshold: ${threshold}ms)`,
      metadata
    );
  } else if (process.env.LOG_LEVEL === 'debug') {
    appLogger.logSource(LogSource.SYSTEM, LogLevel.DEBUG,
      `[Performance] ${operation} completed in ${durationMs}ms`,
      metadata
    );
  }
}

/**
 * Log tool operations with reduced verbosity
 */
export function logToolOperation(
  toolName: string,
  operation: 'start' | 'complete' | 'error',
  metadata?: Record<string, unknown>
): void {
  const level = operation === 'error' ? LogLevel.ERROR : LogLevel.INFO;
  const message = `[Tool] ${toolName} ${operation}`;
  
  // Only log start operations in debug mode to reduce spam
  if (operation === 'start' && process.env.LOG_LEVEL !== 'debug') {
    return;
  }
  
  appLogger.logSource(LogSource.MCP, level, message, metadata);
}

/**
 * Log MCP server operations with reduced verbosity
 */
export function logMCPServerOperation(
  serverName: string,
  operation: string,
  level: LogLevel = LogLevel.INFO,
  metadata?: Record<string, unknown>
): void {
  // Reduce verbosity for routine operations
  const routineOperations = ['poll', 'heartbeat', 'status_check'];
  if (routineOperations.includes(operation.toLowerCase()) && process.env.LOG_LEVEL !== 'debug') {
    return;
  }
  
  appLogger.logSource(LogSource.MCP, level, `[MCP Server] ${serverName} - ${operation}`, metadata);
}

/**
 * Log chat operations with essential information only
 */
export function logChatOperation(
  operation: string,
  chatId: string,
  metadata?: Record<string, unknown>
): void {
  // Only log significant chat operations
  const significantOps = ['created', 'error', 'completed', 'timeout'];
  const isSignificant = significantOps.some(op => operation.toLowerCase().includes(op));
  
  if (isSignificant || process.env.LOG_LEVEL === 'debug') {
    appLogger.logSource(LogSource.HTTP, LogLevel.INFO, 
      `[Chat] ${operation} - ${chatId.substring(0, 8)}...`, 
      metadata
    );
  }
}

/**
 * Log throttled operations (middleware, API calls, etc.) to reduce spam
 * Only logs every Nth operation or after a time threshold
 */
export function logThrottledOperation(
  operationType: string,
  operation: string,
  key: string,
  metadata?: Record<string, unknown>
): void {
  const throttleKey = `${operationType}:${key}`;
  const now = Date.now();
  const existing = cacheLogCounts.get(throttleKey);
  
  if (!existing) {
    cacheLogCounts.set(throttleKey, { count: 1, lastLogged: now });
    // Always log the first operation of each type
    console.debug(`[Throttled] ${operation}`, metadata);
    return;
  }
  
  existing.count++;
  const shouldLog = 
    existing.count % CACHE_LOG_BATCH_SIZE === 0 || 
    (now - existing.lastLogged) > CACHE_LOG_THROTTLE_MS;
    
  if (shouldLog) {
    existing.lastLogged = now;
    console.debug(`[Throttled] ${operation} (${existing.count} ops)`, metadata);
  }
}

/**
 * Get cache statistics for monitoring
 */
export function getCacheLogStats(): Record<string, { count: number, lastLogged: number }> {
  return Object.fromEntries(cacheLogCounts.entries());
}

/**
 * Reset cache log counters (useful for testing or periodic cleanup)
 */
export function resetCacheLogStats(): void {
  cacheLogCounts.clear();
} 