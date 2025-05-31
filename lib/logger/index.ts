// Minimal logger implementation to resolve import issues
// Complex logging system temporarily disabled

// Simple, direct export to avoid module resolution issues
export const appLogger = {
  debug: (message: string, metadata?: Record<string, unknown>) => console.log(`[DEBUG] ${message}`, metadata),
  info: (message: string, metadata?: Record<string, unknown>) => console.log(`[INFO] ${message}`, metadata),
  warn: (message: string, metadata?: Record<string, unknown>) => console.warn(`[WARN] ${message}`, metadata),
  error: (message: string, error?: Error, metadata?: Record<string, unknown>) => console.error(`[ERROR] ${message}`, error, metadata),
  fatal: (message: string, error?: Error, metadata?: Record<string, unknown>) => console.error(`[FATAL] ${message}`, error, metadata),
  mcp: {
    debug: (message: string, metadata?: Record<string, unknown>) => console.log(`[MCP DEBUG] ${message}`, metadata),
    info: (message: string, metadata?: Record<string, unknown>) => console.log(`[MCP INFO] ${message}`, metadata),
    warn: (message: string, metadata?: Record<string, unknown>) => console.warn(`[MCP WARN] ${message}`, metadata),
    error: (message: string, error?: Error, metadata?: Record<string, unknown>) => console.error(`[MCP ERROR] ${message}`, error, metadata),
  },
  aiSdk: {
    debug: (message: string, metadata?: Record<string, unknown>) => console.log(`[AI SDK DEBUG] ${message}`, metadata),
    info: (message: string, metadata?: Record<string, unknown>) => console.log(`[AI SDK INFO] ${message}`, metadata),
    warn: (message: string, error?: Error, metadata?: Record<string, unknown>) => console.warn(`[AI SDK WARN] ${message}`, error, metadata),
    error: (message: string, error?: Error, metadata?: Record<string, unknown>) => console.error(`[AI SDK ERROR] ${message}`, error, metadata),
  },
  http: {
    debug: (message: string, metadata?: Record<string, unknown>) => console.log(`[HTTP DEBUG] ${message}`, metadata),
    info: (message: string, metadata?: Record<string, unknown>) => console.log(`[HTTP INFO] ${message}`, metadata),
    warn: (message: string, metadata?: Record<string, unknown>) => console.warn(`[HTTP WARN] ${message}`, metadata),
    error: (message: string, error?: Error, metadata?: Record<string, unknown>) => console.error(`[HTTP ERROR] ${message}`, error, metadata),
  },
  withContext: () => ({
    debug: (message: string, metadata?: Record<string, unknown>) => console.log(`[CONTEXT DEBUG] ${message}`, metadata),
    info: (message: string, metadata?: Record<string, unknown>) => console.log(`[CONTEXT INFO] ${message}`, metadata),
    warn: (message: string, metadata?: Record<string, unknown>) => console.warn(`[CONTEXT WARN] ${message}`, metadata),
    error: (message: string, error?: Error, metadata?: Record<string, unknown>) => console.error(`[CONTEXT ERROR] ${message}`, error, metadata),
    fatal: (message: string, error?: Error, metadata?: Record<string, unknown>) => console.error(`[CONTEXT FATAL] ${message}`, error, metadata),
  }),
  generateCorrelationId: () => Date.now().toString(),
  healthCheck: async () => ({ status: 'healthy' as const, message: 'Simple logger active' }),
};

// Re-export constants for convenience - temporarily commented out
// export { LogLevel, LogSource } from './constants';

// Re-export types - temporarily commented out
// export type { LogEntry } from './types'; 