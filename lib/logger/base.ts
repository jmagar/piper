import winston from 'winston';
import { LogLevel } from './constants';

// Basic console format for the base logger
const baseConsoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let output = `${timestamp} [BASE-${level}] ${message}`;
    if (Object.keys(meta).length > 0 && meta.constructor === Object) {
        const metaString = JSON.stringify(meta, null, 2);
        if (metaString !== '{}') {
            output += `\n${metaString}`;
        }
    }
    return output;
  })
);

const baseLoggerInstance = winston.createLogger({
  level: LogLevel.DEBUG, // Base logger can be more verbose initially
  format: baseConsoleFormat,
  transports: [
    new winston.transports.Console(),
  ],
  exitOnError: false,
});

export { baseLoggerInstance }; 