/**
 * Socket Logger
 * 
 * Provides specialized logging functionality for Socket.IO operations.
 * Includes structured logging and log filtering.
 */

import type { Socket } from '../core/types';
import type { LogEntry } from '../core/events';

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

/**
 * Socket logger options
 */
interface SocketLoggerOptions {
  namespace: string;
  minLevel?: LogLevel;
  emitToServer?: boolean;
  logToConsole?: boolean;
  formatErrors?: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Default logger options
 */
const DEFAULT_OPTIONS: SocketLoggerOptions = {
  namespace: 'socket',
  minLevel: LogLevel.INFO,
  emitToServer: false,
  logToConsole: true,
  formatErrors: true,
};

/**
 * Socket logger class for structured logging
 */
export class SocketLogger {
  private options: SocketLoggerOptions;
  private socket: Socket | null = null;
  private listeners: Array<(entry: LogEntry) => void> = [];
  
  /**
   * Create a new socket logger
   */
  constructor(options: Partial<SocketLoggerOptions>) {
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options
    };
  }
  
  /**
   * Set the socket instance for emitting logs
   */
  setSocket(socket: Socket | null): void {
    this.socket = socket;
  }
  
  /**
   * Check if a log level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const minLevelIndex = levels.indexOf(this.options.minLevel || LogLevel.INFO);
    const currentLevelIndex = levels.indexOf(level);
    
    return currentLevelIndex >= minLevelIndex;
  }
  
  /**
   * Create a log entry
   */
  private createLogEntry(level: LogLevel, message: string, metadata?: Record<string, unknown>): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      namespace: this.options.namespace,
      level,
      message,
      server: 'Client',
      metadata: {
        ...this.options.metadata,
        ...metadata
      }
    };
  }
  
  /**
   * Handle a log entry
   */
  private handleLogEntry(entry: LogEntry): void {
    // Log to console if enabled
    if (this.options.logToConsole) {
      const consoleMethod = this.getConsoleMethod(entry.level as LogLevel);
      const prefix = `[${entry.namespace}] [${entry.level.toUpperCase()}]`;
      
      if (entry.metadata && typeof entry.metadata === 'object' && Object.keys(entry.metadata).length > 0) {
        consoleMethod(`${prefix} ${entry.message}`, entry.metadata);
      } else {
        consoleMethod(`${prefix} ${entry.message}`);
      }
    }
    
    // Emit to server if enabled and socket is available
    if (this.options.emitToServer && this.socket) {
      // Use type assertion to bypass TypeScript's type checking for custom events
      (this.socket as any).emit('client:log', entry);
      
      // Also emit to the mcp:all:logs event for compatibility
      try {
        (this.socket as any).emit('mcp:all:logs', entry);
      } catch (err) {
        // Ignore if this event is not supported
      }
    }
    
    // Notify listeners
    this.listeners.forEach(listener => {
      try {
        listener(entry);
      } catch (err) {
        console.error('Error in log listener:', err);
      }
    });
  }
  
  /**
   * Get the appropriate console method for a log level
   */
  private getConsoleMethod(level: LogLevel): (message: string, ...args: any[]) => void {
    switch (level) {
      case LogLevel.DEBUG:
        return console.debug;
      case LogLevel.INFO:
        return console.info;
      case LogLevel.WARN:
        return console.warn;
      case LogLevel.ERROR:
        return console.error;
      default:
        return console.log;
    }
  }
  
  /**
   * Log a debug message
   */
  debug(message: string, metadata?: Record<string, unknown>): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    
    const entry = this.createLogEntry(LogLevel.DEBUG, message, metadata);
    this.handleLogEntry(entry);
  }
  
  /**
   * Log an info message
   */
  info(message: string, metadata?: Record<string, unknown>): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    
    const entry = this.createLogEntry(LogLevel.INFO, message, metadata);
    this.handleLogEntry(entry);
  }
  
  /**
   * Log a warning message
   */
  warn(message: string, metadata?: Record<string, unknown>): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    
    const entry = this.createLogEntry(LogLevel.WARN, message, metadata);
    this.handleLogEntry(entry);
  }
  
  /**
   * Log an error message
   */
  error(message: string | Error, metadata?: Record<string, unknown>): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    
    let errorMessage: string;
    let errorMetadata: Record<string, unknown> = { ...metadata };
    
    // Format the error if it's an Error object and formatting is enabled
    if (message instanceof Error && this.options.formatErrors) {
      errorMessage = message.message;
      
      errorMetadata = {
        ...errorMetadata,
        errorName: message.name,
        stack: message.stack,
        cause: message.cause,
        // Add additional debugging information for network errors
        isTimeout: message.message === 'timeout',
        isNetworkError: message.message?.includes('network') || message.message?.includes('connect'),
        timestamp: new Date().toISOString(),
        browserInfo: typeof navigator !== 'undefined' ? {
          userAgent: navigator.userAgent,
          onLine: navigator.onLine
        } : undefined
      };
      
      // Special handling for timeout errors
      if (message.message === 'timeout') {
        console.warn('[SOCKET:CONNECTION] Timeout error detected, providing detailed debug info', {
          online: typeof navigator !== 'undefined' ? navigator.onLine : 'unknown',
          time: new Date().toISOString(),
          ...errorMetadata
        });
      }
    } else {
      errorMessage = message instanceof Error ? message.message : message;
    }
    
    const entry = this.createLogEntry(LogLevel.ERROR, errorMessage, errorMetadata);
    this.handleLogEntry(entry);
  }
  
  /**
   * Add a log listener
   * @returns Function to remove the listener
   */
  addListener(listener: (entry: LogEntry) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
}

// Create a singleton instance
let loggerInstance: SocketLogger | null = null;

/**
 * Get or create a socket logger instance
 */
export function getSocketLogger(options?: Partial<SocketLoggerOptions>): SocketLogger {
  if (!loggerInstance) {
    loggerInstance = new SocketLogger(options || {});
  } else if (options) {
    // Update options if provided
    loggerInstance = new SocketLogger(options);
  }
  
  return loggerInstance;
}
