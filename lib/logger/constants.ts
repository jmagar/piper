// Logger constants - separated to avoid circular dependencies

export enum LogLevel {
  FATAL = 'fatal',
  ERROR = 'error', 
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

export enum LogSource {
  APP = 'app',
  HTTP = 'http',
  MCP = 'mcp',
  AI_SDK = 'ai-sdk',
  ERROR = 'error',
  SYSTEM = 'system'
} 