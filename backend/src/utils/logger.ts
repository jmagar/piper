/**
 * Logger utility for consistent logging across the application
 * Provides a class-based interface for logging with namespaces
 */

import winston from 'winston';

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

export { logger }; 