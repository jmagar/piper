/**
 * Logger utility for consistent logging across the application
 * Provides a class-based interface for logging with namespaces
 */

import winston from 'winston';
import debug from 'debug';

// Create logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  defaultMeta: { service: 'pooper-api' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return `[${timestamp}] ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
        }),
      ),
    }),
  ],
});

// Logger class for namespaced logging
export class Logger {
  private namespace: string;
  private debugger: debug.Debugger;

  constructor(namespace: string) {
    this.namespace = namespace;
    this.debugger = debug(`pooper:${namespace}`);
  }

  info(message: string, ...args: any[]) {
    this.debugger(message, ...args);
    logger.info(`[${this.namespace}] ${message}`, ...args);
  }

  error(message: string, ...args: any[]) {
    this.debugger.extend('error')(message, ...args);
    logger.error(`[${this.namespace}] ${message}`, ...args);
  }

  warn(message: string, ...args: any[]) {
    this.debugger.extend('warn')(message, ...args);
    logger.warn(`[${this.namespace}] ${message}`, ...args);
  }

  debug(message: string, ...args: any[]) {
    this.debugger.extend('debug')(message, ...args);
    logger.debug(`[${this.namespace}] ${message}`, ...args);
  }
}

// Export the winston logger instance
export { logger };