import chalk from 'chalk';
import config from '../config.js';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const logLevelValue: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

class Logger {
  private level: number;
  private useColors: boolean;

  constructor() {
    this.level = logLevelValue[config.logLevel];
    this.useColors = config.colorizeOutput;
  }

  private shouldLog(level: LogLevel): boolean {
    return logLevelValue[level] >= this.level;
  }

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    
    if (!this.useColors) {
      return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    }
    
    // Apply colors based on log level
    let colorizedLevel: string;
    switch (level) {
      case 'debug':
        colorizedLevel = chalk.gray(`[DEBUG]`);
        break;
      case 'info':
        colorizedLevel = chalk.blue(`[INFO]`);
        break;
      case 'warn':
        colorizedLevel = chalk.yellow(`[WARN]`);
        break;
      case 'error':
        colorizedLevel = chalk.red(`[ERROR]`);
        break;
      default:
        colorizedLevel = `[${String(level).toUpperCase()}]`;
    }
    
    return `${chalk.gray(`[${timestamp}]`)} ${colorizedLevel} ${message}`;
  }

  debug(message: string): void {
    if (this.shouldLog('debug')) {
      console.log(this.formatMessage('debug', message));
    }
  }

  info(message: string): void {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message));
    }
  }

  warn(message: string): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message));
    }
  }

  error(message: string, error?: unknown): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message));
      if (error) {
        if (error instanceof Error) {
          console.error(
            this.useColors ? chalk.red(error.stack || error.message) : error.stack || error.message
          );
        } else {
          console.error(error);
        }
      }
    }
  }

  success(message: string): void {
    if (this.shouldLog('info')) {
      console.log(
        this.useColors
          ? `${chalk.gray(`[${new Date().toISOString()}]`)} ${chalk.green('[SUCCESS]')} ${message}`
          : `[${new Date().toISOString()}] [SUCCESS] ${message}`
      );
    }
  }

  // For duplicate file warnings with syntax highlighting
  duplicateWarning(baseName: string, files: string[]): void {
    if (!this.shouldLog('warn')) return;
    
    const extensions = files.map(f => f.split('.').pop() || '');
    
    console.warn(
      this.useColors
        ? `${chalk.gray(`[${new Date().toISOString()}]`)} ${chalk.yellow('[DUPLICATE]')} ${
            chalk.bold(config.duplicateWarningMessage)
          }: '${chalk.cyan(baseName)}' with extensions: ${chalk.yellow(extensions.join(', '))}`
        : `[${new Date().toISOString()}] [DUPLICATE] ${
            config.duplicateWarningMessage
          }: '${baseName}' with extensions: ${extensions.join(', ')}`
    );
    
    files.forEach((file, idx) => {
      console.warn(
        this.useColors
          ? `   ${chalk.gray(`${idx + 1}.`)} ${file}`
          : `   ${idx + 1}. ${file}`
      );
    });
    
    console.warn(this.useColors ? chalk.gray('='.repeat(80)) : '='.repeat(80));
  }
}

export const logger = new Logger();
export default logger;