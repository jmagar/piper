// Determine if running in a Node.js environment (server-side)
const IS_SERVER = typeof window === 'undefined';

import type { TransformableInfo } from 'logform';
// Import necessary types from ./types
import { LogSourceValue, LogContext, LoggerInstance, IAppLogger, LogLevel } from './types';
import { LogSource } from './constants';
export { LogLevel } from './types'; // Export LogLevel from types.ts
export { LogSource } from './constants'; // Export LogSource from constants.ts

// Note: LogSourceValue from './types' is the definitive type for sources in IAppLogger.

// Variables for server-side components, will be initialized asynchronously
let winston: typeof import('winston') | undefined;
let DailyRotateFile: typeof import('winston-daily-rotate-file') | undefined;
let path: typeof import('path') | undefined;
let consoleFormat: import('winston').Logform.Format | undefined;
let winstonLogger: import('winston').Logger | null = null;

let serverLoggerPromise: Promise<void> | null = null;

async function initializeServerComponents() {
  if (!IS_SERVER) return;

  try {
    const winstonModule = await import('winston');
    winston = winstonModule.default || winstonModule;
    
    const dailyRotateModule = await import('winston-daily-rotate-file');
    DailyRotateFile = dailyRotateModule.default || dailyRotateModule;
    
    const pathModule = await import('path');
    path = pathModule.default || pathModule;

    consoleFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.colorize(),
      winston.format.printf((info: TransformableInfo) => {
        let output = `${info.timestamp} [${info.level}]`;
        if (info.source) output += ` [${info.source}]`;
        if (info.correlationId) output += ` [${info.correlationId}]`;
        output += `: ${info.message}`;
        
        const knownKeys: (string | symbol)[] = [
          'timestamp', 'level', 'message', 'source', 'correlationId', 'stack', 'splat', 
          Symbol.for('level'), Symbol.for('message'), Symbol.for('splat'), Symbol.for('id')
        ];
        let metaString = '';
        for (const key in info) {
          if (!knownKeys.includes(key) && Object.prototype.hasOwnProperty.call(info, key)) {
            const stringKey = String(key);
            try {
              if (stringKey === 'metadata' && typeof info[key] === 'object' && info[key] !== null) {
                let subMetaString = '';
                for (const subKey in info[key] as Record<string, unknown>) {
                  if (!knownKeys.includes(subKey) && Object.prototype.hasOwnProperty.call(info[key], subKey)) {
                    subMetaString += ` ${subKey}=${JSON.stringify((info[key] as Record<string, unknown>)[subKey])}`;
                  }
                }
                if (subMetaString) metaString += subMetaString;
              } else {
                metaString += ` ${stringKey}=${JSON.stringify(info[key])}`;
              }
            } catch {
              metaString += ` ${stringKey}=[Unserializable]`;
            }
          }
        }
        if (metaString) {
          output += metaString;
        }
  
        if (info.stack) {
           output += `\n${info.stack}`;
        }
        return output;
      })
    );

    // Initialize logsDir now that path is available
    const logsDir = path.join(process.cwd(), 'logs');

    // Assign to module-level variables
    winstonLogger = createWinstonLogger(logsDir);

  } catch (error) {
    console.error('Failed to initialize server logger components:', error);
    // Fallback or error state - winston, path, etc., will remain undefined
    // This might mean server logs won't work, clientLogger will be used by default.
  }
}

// Environment configuration
const isDevelopment = process.env.NODE_ENV === 'development';
const logLevel = process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info');

// Create daily rotating file transport
const createFileTransport = (logsDir: string, filename: string, level?: string) => {
  // Safety checks for required modules
  if (!DailyRotateFile) {
    throw new Error('DailyRotateFile module not initialized - winston-daily-rotate-file import failed');
  }
  if (!path) {
    throw new Error('Path module not initialized - path import failed');
  }
  if (!winston) {
    throw new Error('Winston module not initialized - winston import failed');
  }

  // Use environment-specific rotation config
  const env = process.env.NODE_ENV as 'development' | 'production' | 'testing' || 'development';
  const rotationConfigs = {
    development: { maxSize: '10m', maxFiles: '7d', datePattern: 'YYYY-MM-DD', compress: false },
    production: { maxSize: '50m', maxFiles: '90d', datePattern: 'YYYY-MM-DD', compress: true },
    testing: { maxSize: '1m', maxFiles: '1d', datePattern: 'YYYY-MM-DD', compress: false },
  };
  const config = rotationConfigs[env] || rotationConfigs.development;

  return new DailyRotateFile({
    filename: path.join(logsDir, `${filename}-%DATE%.log`),
    datePattern: config.datePattern,
    maxSize: config.maxSize,
    maxFiles: config.maxFiles,
    level: level || logLevel,
    zippedArchive: config.compress, // Environment-configurable compression
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    auditFile: path.join(logsDir, `${filename}-audit.json`), // Track rotated files
  });
};

// Create Winston logger with basic file transports
const createWinstonLogger = (logsDir: string) => {
  // Safety check for winston module
  if (!winston) {
    throw new Error('Winston module not initialized - winston import failed');
  }

  const logFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  );

  const transports = [
    createFileTransport(logsDir, 'app', logLevel), // Main application logs
    createFileTransport(logsDir, 'error', 'error'), // Error logs only
  ];

  const logger = winston.createLogger({
    level: logLevel,
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

// winstonLogger is now initialized in initializeServerComponents

export async function ensureLoggerInitialization(): Promise<void> {
  if (IS_SERVER) {
    if (!serverLoggerPromise) {
      serverLoggerPromise = initializeServerComponents();
    }
    await serverLoggerPromise;
  } else {
    // No async initialization needed for client logger
    return Promise.resolve();
  }
}

interface UploadLoggerService {
  info: (message: string, details?: unknown) => Promise<void> | void;
  warn: (message: string, details?: unknown) => Promise<void> | void;
  error: (message: string, error?: Error | unknown, details?: unknown) => Promise<void> | void;
}

const _internalClientLog = (level: LogLevel, message: string, context?: LogContext, source?: LogSourceValue): void => {
  // Map LogLevel enum to console method names (strings)
  let consoleMethodName: 'debug' | 'info' | 'warn' | 'error' | 'log' = 'log';
  switch (level) {
    case LogLevel.DEBUG: consoleMethodName = 'debug'; break;
    case LogLevel.INFO: consoleMethodName = 'info'; break;
    case LogLevel.WARN: consoleMethodName = 'warn'; break;
    case LogLevel.ERROR: consoleMethodName = 'error'; break;
    case LogLevel.FATAL: consoleMethodName = 'error'; break; // Console doesn't have fatal, map to error
  }
  const metaForConsole = { ...context, source: source || LogSource.APP, timestamp: new Date().toISOString() };

  // Ensure error objects are properly formatted for console
  if (metaForConsole.error && metaForConsole.error instanceof Error) {
    // Console typically handles Error objects well, but we can serialize if needed
    // metaForConsole.error = { message: metaForConsole.error.message, stack: metaForConsole.error.stack, name: metaForConsole.error.name };
  }

  const logMessage = `[${(source || LogSource.APP).toUpperCase()}] ${message}`;

  const consoleMethod = console[consoleMethodName] || console.log; // Fallback to console.log
  if (typeof consoleMethod === 'function') {
    consoleMethod(logMessage, metaForConsole);
  } else {
    // Should not happen with the switch and fallback, but as a last resort:
    console.log(`[${level.toUpperCase()}] ${logMessage}`, metaForConsole);
  }
};

const clientLogger: IAppLogger = {
  debug: (message: string, context?: LogContext) => { _internalClientLog(LogLevel.DEBUG, message, context, LogSource.APP); },
  info: (message: string, context?: LogContext) => { _internalClientLog(LogLevel.INFO, message, context, LogSource.APP); },
  warn: (message: string, context?: LogContext) => { _internalClientLog(LogLevel.WARN, message, context, LogSource.APP); },
  error: (message: string, context?: LogContext) => { _internalClientLog(LogLevel.ERROR, message, context, LogSource.APP); },
  logSource: (source: LogSourceValue, level: LogLevel, message: string, context?: LogContext) => { _internalClientLog(level, message, context, source); },
  withContext: function(this: IAppLogger, contextInput: Partial<LogContext> | LogSourceValue): LoggerInstance {
    const baseSource = typeof contextInput === 'string' ? contextInput : contextInput.source || LogSource.APP;
    const baseMeta = typeof contextInput === 'string' ? {} : { ...contextInput };
    delete baseMeta.source; // Source is handled separately

    return {
      debug: (msg: string, meta?: Record<string, unknown>) => this.logSource(baseSource, LogLevel.DEBUG, msg, { ...baseMeta, ...meta } as LogContext),
      info: (msg: string, meta?: Record<string, unknown>) => this.logSource(baseSource, LogLevel.INFO, msg, { ...baseMeta, ...meta } as LogContext),
      warn: (msg: string, meta?: Record<string, unknown>) => this.logSource(baseSource, LogLevel.WARN, msg, { ...baseMeta, ...meta } as LogContext),
      error: (msg: string, err?: Error, meta?: Record<string, unknown>) => {
        this.logSource(baseSource, LogLevel.ERROR, msg, { ...baseMeta, ...meta, error: err } as LogContext);
      },
      fatal: (msg: string, err?: Error, meta?: Record<string, unknown>) => {
        this.logSource(baseSource, LogLevel.FATAL, `FATAL: ${msg}`, { ...baseMeta, ...meta, error: err } as LogContext);
      },
    };
  },
  mcp: null!, // Initialized immediately after object creation
  aiSdk: null!, // Initialized immediately after object creation
};
clientLogger.mcp = clientLogger.withContext(LogSource.MCP);
clientLogger.aiSdk = clientLogger.withContext(LogSource.AI_SDK);

const _internalServerLog = async (level: LogLevel, message: string, context?: LogContext, source?: LogSourceValue): Promise<void> => {
  await ensureLoggerInitialization();
  const logSource = source || LogSource.APP;
  const logMeta = { ...context, source: logSource, timestamp: new Date().toISOString() };

  // Ensure error objects are properly formatted for Winston
  if (logMeta.error && logMeta.error instanceof Error) {
    logMeta.error = { message: logMeta.error.message, stack: logMeta.error.stack, name: logMeta.error.name };
  }

  const winstonLevel = level.toLowerCase();
  if (winstonLogger && typeof (winstonLogger as unknown as Record<string, unknown>)[winstonLevel] === 'function') {
    (winstonLogger as unknown as Record<string, (msg: string, meta: Record<string, unknown>) => void>)[winstonLevel](message, logMeta);
  } else {
    // Fallback if Winston isn't initialized or level is somehow invalid
    const simpleContext = { ...context };
    delete simpleContext.error; // Avoid circular refs with raw error
    console.log(`[${logSource}] [${level}] (Winston N/A) ${message}`, simpleContext, (context?.error && context.error instanceof Error) ? { name: context.error.name, message: context.error.message, stack: context.error.stack } : (context?.error ? { error_unknown: context.error as unknown } : ''));
  }
};

const serverLogger: IAppLogger = {
  debug: (message: string, context?: LogContext) => { _internalServerLog(LogLevel.DEBUG, message, context, LogSource.APP).catch((_: unknown) => { /* console.error('Server logging failed (debug):', _) */ }); }, // eslint-disable-line @typescript-eslint/no-unused-vars
  info: (message: string, context?: LogContext) => { _internalServerLog(LogLevel.INFO, message, context, LogSource.APP).catch((_: unknown) => { /* console.error('Server logging failed (info):', _) */ }); }, // eslint-disable-line @typescript-eslint/no-unused-vars
  warn: (message: string, context?: LogContext) => { _internalServerLog(LogLevel.WARN, message, context, LogSource.APP).catch((_: unknown) => { /* console.error('Server logging failed (warn):', _) */ }); }, // eslint-disable-line @typescript-eslint/no-unused-vars
  error: (message: string, context?: LogContext) => { _internalServerLog(LogLevel.ERROR, message, context, LogSource.APP).catch((_: unknown) => { /* console.error('Server logging failed (error):', _) */ }); }, // eslint-disable-line @typescript-eslint/no-unused-vars
  logSource: async (source: LogSourceValue, level: LogLevel, message: string, context?: LogContext) => { await _internalServerLog(level, message, context, source); },
  withContext: function(this: IAppLogger, contextInput: Partial<LogContext> | LogSourceValue): LoggerInstance {
    const baseSource = typeof contextInput === 'string' ? contextInput : contextInput.source || LogSource.APP;
    const baseMeta = typeof contextInput === 'string' ? {} : { ...contextInput };
    delete baseMeta.source; // Source is handled separately

    return {
      debug: (msg: string, meta?: Record<string, unknown>) => this.logSource(baseSource, LogLevel.DEBUG, msg, { ...baseMeta, ...meta } as LogContext),
      info: (msg: string, meta?: Record<string, unknown>) => this.logSource(baseSource, LogLevel.INFO, msg, { ...baseMeta, ...meta } as LogContext),
      warn: (msg: string, meta?: Record<string, unknown>) => this.logSource(baseSource, LogLevel.WARN, msg, { ...baseMeta, ...meta } as LogContext),
      error: (msg: string, err?: Error, meta?: Record<string, unknown>) => {
        this.logSource(baseSource, LogLevel.ERROR, msg, { ...baseMeta, ...meta, error: err } as LogContext);
      },
      fatal: (msg: string, err?: Error, meta?: Record<string, unknown>) => {
        this.logSource(baseSource, LogLevel.FATAL, `FATAL: ${msg}`, { ...baseMeta, ...meta, error: err } as LogContext);
      },
    };
  },
  mcp: null!, // Initialized immediately after object creation
  aiSdk: null!, // Initialized immediately after object creation
};
serverLogger.mcp = serverLogger.withContext(LogSource.MCP);
serverLogger.aiSdk = serverLogger.withContext(LogSource.AI_SDK);

export const appLogger = IS_SERVER ? serverLogger : clientLogger; // Fallback to client logger for client-side compatibility

// Upload logger for backward compatibility
// Conditionally export uploadLogger or provide a client-safe version
export const uploadLogger: UploadLoggerService = IS_SERVER
  ? {
    info: async (message: string, details?: unknown): Promise<void> => {
      await ensureLoggerInitialization();
      if (!winstonLogger) {
        throw new Error('Winston logger not initialized');
      }
      winstonLogger.log(LogLevel.INFO, message, { details, source: LogSource.APP }); // Changed LogSource.UPLOAD to LogSource.APP
    },
    warn: async (message: string, details?: unknown): Promise<void> => {
      await ensureLoggerInitialization();
      if (!winstonLogger) {
        throw new Error('Winston logger not initialized');
      }
      winstonLogger.log(LogLevel.WARN, message, { details, source: LogSource.APP }); // Changed LogSource.UPLOAD to LogSource.APP
    },
    error: async (message: string, error?: Error | unknown, details?: unknown): Promise<void> => {
      await ensureLoggerInitialization();
      if (!winstonLogger) {
        throw new Error('Winston logger not initialized');
      }
      if (error instanceof Error) {
        winstonLogger.log(LogLevel.ERROR, message, { error: { message: error.message, stack: error.stack }, details, source: LogSource.APP }); // Changed LogSource.UPLOAD to LogSource.APP
      } else {
        winstonLogger.log(LogLevel.ERROR, message, { error, details, source: LogSource.APP }); // Changed LogSource.UPLOAD to LogSource.APP
      }
    },
  }
  : {
  // Client-side safe uploadLogger
  info: (message: string, details?: unknown) => console.info(`[UPLOAD_CLIENT] ${message}`, details || '' as unknown),
  warn: (message: string, details?: unknown) => console.warn(`[UPLOAD_CLIENT] ${message}`, details || '' as unknown),
  error: (message: string, error?: unknown) => console.error(`[UPLOAD_CLIENT] ${message}`, error || '' as unknown),
};

// Simple re-exports for convenience
// Export LogLevel and LogSource from types directly if needed, or define them here if they must be different.
// For now, assuming they are consumed from './types' via IAppLogger and other interfaces.

// Exporting LoggerInstance as ContextualLogMethods for managed-client compatibility
export type { LoggerInstance as ContextualLogMethods };

export const LogLevelValues = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  FATAL: 'fatal',
} as const;

// LogSource is imported from './constants'. The local re-declaration has been removed. 