/**
 * Unified logging utility for consistent logging across the application
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogOptions {
  timestamp?: boolean;
  namespace?: string;
  data?: any;
}

const defaultOptions: LogOptions = {
  timestamp: true,
  namespace: 'app'
};

/**
 * Unified logging utility for consistent logging across the application
 * 
 * @param level - Log level: 'debug', 'info', 'warn', or 'error'
 * @param message - Message to log
 * @param dataOrOptions - Additional data to log or options object
 */
export function logEvent(level: LogLevel, message: string, dataOrOptions?: any | LogOptions) {
  const options: LogOptions = { ...defaultOptions };
  let data: any = undefined;
  
  if (dataOrOptions) {
    if (typeof dataOrOptions === 'object' && 'namespace' in dataOrOptions) {
      Object.assign(options, dataOrOptions);
      data = options.data;
    } else {
      data = dataOrOptions;
    }
  }
  
  const timestamp = options.timestamp ? `[${new Date().toISOString()}]` : '';
  const namespace = options.namespace ? `[${options.namespace}]` : '';
  const prefix = `${timestamp}${namespace}`;
  
  switch (level) {
    case 'debug':
      if (process.env.NODE_ENV !== 'production') {
        console.log(`${prefix} ${message}`, data);
      }
      break;
    case 'info':
      console.log(`${prefix} ${message}`, data);
      break;
    case 'warn':
      console.warn(`${prefix} ${message}`, data);
      break;
    case 'error':
      console.error(`${prefix} ${message}`, data);
      break;
  }
  
  // Can be extended to send logs to monitoring services
} 