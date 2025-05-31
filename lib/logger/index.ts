import winston from 'winston';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Environment configuration
const isDevelopment = process.env.NODE_ENV === 'development';
const logsDir = path.join(process.cwd(), 'logs');

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, source, correlationId, ...meta }) => {
    let output = `${timestamp} [${level}]`;
    if (source) output += ` [${source}]`;
    if (correlationId) output += ` [${correlationId}]`;
    output += `: ${message}`;
    
    const metaObj = meta.metadata || meta;
    if (Object.keys(metaObj).length > 0) {
      output += ` ${JSON.stringify(metaObj)}`;
    }
    
    return output;
  })
);

export type LogSource = 'APP' | 'MCP' | 'AI_SDK' | 'HTTP';

export interface LogMetadata {
  [key: string]: unknown;
}

// Create regular file transport (no date rotation)
const createFileTransport = (filename: string, level?: string) => {
  return new winston.transports.File({
    filename: path.join(logsDir, `${filename}.log`),
    level: level || 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    maxsize: 20 * 1024 * 1024, // 20MB
    maxFiles: 5, // Keep 5 backup files
  });
};

// Create Winston logger with file transports
const createWinstonLogger = () => {
  const logFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  );

  const transports = [
    createFileTransport('app', 'info'), // General app logs
    createFileTransport('error', 'error'), // Error logs
  ];

  const logger = winston.createLogger({
    level: 'debug',
    format: logFormat,
    transports,
    defaultMeta: { service: 'piper' },
  });

  // Add console transport for development
  if (isDevelopment) {
    logger.add(new winston.transports.Console({
      format: consoleFormat
    }));
  }

  return logger;
};

// Create source-specific loggers
const createSourceLoggers = () => {
  return {
    mcp: winston.createLogger({
      level: 'debug',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [createFileTransport('mcp')],
      defaultMeta: { service: 'piper' },
    }),
    aiSdk: winston.createLogger({
      level: 'debug',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [createFileTransport('ai-sdk')],
      defaultMeta: { service: 'piper' },
    }),
    http: winston.createLogger({
      level: 'debug',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [createFileTransport('http')],
      defaultMeta: { service: 'piper' },
    }),
  };
};

// Initialize Winston loggers
const winstonLogger = createWinstonLogger();
const sourceLoggers = createSourceLoggers();

// Enhanced logger implementation with Winston file logging
export const appLogger = {
  debug: (message: string, metadata?: Record<string, unknown> | string | number) => {
    const metaObj = typeof metadata === 'object' ? metadata : { data: metadata };
    winstonLogger.debug(message, { source: 'APPLICATION', metadata: metaObj });
  },
  info: (message: string, metadata?: Record<string, unknown> | string | number) => {
    const metaObj = typeof metadata === 'object' ? metadata : { data: metadata };
    winstonLogger.info(message, { source: 'APPLICATION', metadata: metaObj });
  },
  warn: (message: string, metadata?: Record<string, unknown> | string | number) => {
    const metaObj = typeof metadata === 'object' ? metadata : { data: metadata };
    winstonLogger.warn(message, { source: 'APPLICATION', metadata: metaObj });
  },
  error: (message: string, error?: Error | unknown, metadata?: Record<string, unknown>) => {
    const err = error instanceof Error ? error : new Error(String(error));
    winstonLogger.error(message, { source: 'ERROR', error: err, metadata });
  },
  fatal: (message: string, error?: Error | unknown, metadata?: Record<string, unknown>) => {
    const err = error instanceof Error ? error : new Error(String(error));
    winstonLogger.error(message, { source: 'ERROR', error: err, metadata, level: 'fatal' });
  },
  mcp: {
    debug: (message: string, metadata?: Record<string, unknown> | string | number) => {
      const metaObj = typeof metadata === 'object' ? metadata : { data: metadata };
      sourceLoggers.mcp.debug(message, { source: 'MCP', metadata: metaObj });
    },
    info: (message: string, metadata?: Record<string, unknown> | string | number) => {
      const metaObj = typeof metadata === 'object' ? metadata : { data: metadata };
      sourceLoggers.mcp.info(message, { source: 'MCP', metadata: metaObj });
    },
    warn: (message: string, metadata?: Record<string, unknown> | string | number | unknown) => {
      const metaObj = typeof metadata === 'object' ? metadata : { data: metadata };
      sourceLoggers.mcp.warn(message, { source: 'MCP', metadata: metaObj });
    },
    error: (message: string, error?: Error | unknown, metadata?: Record<string, unknown>) => {
      const err = error instanceof Error ? error : new Error(String(error));
      sourceLoggers.mcp.error(message, { source: 'MCP', error: err, metadata });
    },
  },
  aiSdk: {
    debug: (message: string, metadata?: Record<string, unknown> | string | number) => {
      const metaObj = typeof metadata === 'object' ? metadata : { data: metadata };
      sourceLoggers.aiSdk.debug(message, { source: 'AI_SDK', metadata: metaObj });
    },
    info: (message: string, metadata?: Record<string, unknown> | string | number) => {
      const metaObj = typeof metadata === 'object' ? metadata : { data: metadata };
      sourceLoggers.aiSdk.info(message, { source: 'AI_SDK', metadata: metaObj });
    },
    warn: (message: string, error?: Error | unknown, metadata?: Record<string, unknown>) => {
      const err = error instanceof Error ? error : undefined;
      const metaData = metadata || (typeof error === 'object' && !(error instanceof Error) ? error as Record<string, unknown> : {});
      sourceLoggers.aiSdk.warn(message, { source: 'AI_SDK', error: err, metadata: metaData });
    },
    error: (message: string, error?: Error | unknown, metadata?: Record<string, unknown>) => {
      const err = error instanceof Error ? error : new Error(String(error));
      sourceLoggers.aiSdk.error(message, { source: 'AI_SDK', error: err, metadata });
    },
  },
  http: {
    debug: (message: string, metadata?: Record<string, unknown> | string | number) => {
      const metaObj = typeof metadata === 'object' ? metadata : { data: metadata };
      sourceLoggers.http.debug(message, { source: 'HTTP', metadata: metaObj });
    },
    info: (message: string, metadata?: Record<string, unknown> | string | number) => {
      const metaObj = typeof metadata === 'object' ? metadata : { data: metadata };
      sourceLoggers.http.info(message, { source: 'HTTP', metadata: metaObj });
    },
    warn: (message: string, metadata?: Record<string, unknown> | string | number) => {
      const metaObj = typeof metadata === 'object' ? metadata : { data: metadata };
      sourceLoggers.http.warn(message, { source: 'HTTP', metadata: metaObj });
    },
    error: (message: string, error?: Error | unknown, metadata?: Record<string, unknown>) => {
      const err = error instanceof Error ? error : new Error(String(error));
      sourceLoggers.http.error(message, { source: 'HTTP', error: err, metadata });
    },
  },
  withContext: (correlationId?: string) => ({
    debug: (message: string, metadata?: Record<string, unknown> | string | number) => {
      const metaObj = typeof metadata === 'object' ? metadata : { data: metadata };
      winstonLogger.debug(message, { source: 'APPLICATION', correlationId, metadata: metaObj });
    },
    info: (message: string, metadata?: Record<string, unknown> | string | number) => {
      const metaObj = typeof metadata === 'object' ? metadata : { data: metadata };
      winstonLogger.info(message, { source: 'APPLICATION', correlationId, metadata: metaObj });
    },
    warn: (message: string, metadata?: Record<string, unknown> | string | number) => {
      const metaObj = typeof metadata === 'object' ? metadata : { data: metadata };
      winstonLogger.warn(message, { source: 'APPLICATION', correlationId, metadata: metaObj });
    },
    error: (message: string, error?: Error | unknown, metadata?: Record<string, unknown>) => {
      const err = error instanceof Error ? error : new Error(String(error));
      winstonLogger.error(message, { source: 'ERROR', correlationId, error: err, metadata });
    },
    fatal: (message: string, error?: Error | unknown, metadata?: Record<string, unknown>) => {
      const err = error instanceof Error ? error : new Error(String(error));
      winstonLogger.error(message, { source: 'ERROR', correlationId, error: err, metadata, level: 'fatal' });
    },
  }),
  generateCorrelationId: () => uuidv4(),
  healthCheck: async () => {
    try {
      winstonLogger.info('Logger health check', { source: 'SYSTEM', timestamp: new Date().toISOString() });
      return { status: 'healthy' as const, message: 'Winston logger with file rotation active' };
    } catch (error) {
      return { 
        status: 'unhealthy' as const, 
        message: `Logger health check failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  },
};

// Upload logger for backward compatibility
export const uploadLogger = {
  info: (message: string, details?: unknown): void => {
    appLogger.info(message, { details });
  },
  warn: (message: string, details?: unknown): void => {
    appLogger.warn(message, { details });
  },
  error: (message: string, error?: unknown): void => {
    const err = error instanceof Error ? error : new Error(String(error));
    appLogger.error(message, err, { originalError: error });
  },
};

// Simple re-exports for convenience
export const LogLevel = {
  DEBUG: 'debug' as const,
  INFO: 'info' as const,
  WARN: 'warn' as const,
  ERROR: 'error' as const,
  FATAL: 'fatal' as const,
};

export const LogSource = {
  APP: 'APPLICATION' as const,
  HTTP: 'HTTP' as const,
  MCP: 'MCP' as const,
  AI_SDK: 'AI_SDK' as const,
  ERROR: 'ERROR' as const,
}; 