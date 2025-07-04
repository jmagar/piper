# Piper Logging System Documentation

## Overview

The Piper logging system is a comprehensive, production-ready logging and error handling solution built with Winston. It provides structured JSON logging, correlation tracking, specialized MCP and AI SDK support, security features, and a web-based log viewer.

## Features

- **Centralized Logging**: All logs stored in `/logs` with structured JSON format
- **Error Classification**: Intelligent categorization of errors (MCP, AI SDK, HTTP, etc.)
- **Correlation Tracking**: Request IDs for tracing requests across the application
- **MCP Protocol Support**: Specialized handling for MCP JSON-RPC errors and logging
- **AI SDK Integration**: Error handling for tool execution and streaming operations
- **Log Viewer Component**: React component for viewing and filtering logs
- **Automated Log Rotation**: Daily rotation with configurable retention
- **Security-First**: PII detection and sanitization, access controls
- **Health Monitoring**: Health check endpoints and system monitoring

## Architecture

### Core Components

```
lib/logger/
├── index.ts              # Main logger service
├── error-handler.ts      # Error classification and handling
├── mcp-logger.ts         # MCP-specific logging utilities
├── ai-sdk-logger.ts      # AI SDK logging utilities
├── correlation.ts        # Correlation ID management
├── security.ts           # Security and PII protection
├── rotation-config.ts    # Log rotation configuration
└── types.ts              # TypeScript definitions

middleware/
├── logging.ts            # Request/response logging
├── error-handler.ts      # Global error handling
└── correlation.ts        # Correlation ID middleware

app/components/log-viewer/
└── index.tsx             # Web-based log viewer

app/api/logs/
├── route.ts              # Log API endpoint
├── export/route.ts       # Log export endpoint
└── health/route.ts       # Health check endpoint
```

### Log Directory Structure

```
/logs/
├── app-YYYY-MM-DD.log          # General application logs
├── error-YYYY-MM-DD.log        # Error-specific logs  
├── mcp-YYYY-MM-DD.log          # MCP protocol logs
├── ai-sdk-YYYY-MM-DD.log       # AI SDK operation logs
├── http-YYYY-MM-DD.log         # HTTP request/response logs
└── archived/                   # Rotated logs (30-day retention)
```

## Quick Start

### Basic Usage

```typescript
import { appLogger } from '@/lib/logger'

// Basic logging
appLogger.info('User logged in', { userId: '123' })
appLogger.error('Database connection failed', error)

// Source-specific logging
appLogger.mcp.info('Tool execution started', { toolName: 'search' })
appLogger.aiSdk.info('Model call completed', { model: 'gpt-4', tokens: 150 })
appLogger.http.info('API request received', { endpoint: '/api/chat' })

// Context-aware logging
const contextLogger = appLogger.withContext(correlationId, userId)
contextLogger.info('Processing user request')
```

### MCP Logging

```typescript
import { mcpLogger, McpOperation, JsonRpcMessageType } from '@/lib/logger/mcp-logger'

// Log JSON-RPC messages
mcpLogger.logJsonRpcMessage(
  jsonRpcMessage,
  JsonRpcMessageType.REQUEST,
  serverId,
  McpTransportType.STDIO
)

// Log server lifecycle
mcpLogger.logServerLifecycle(
  McpOperation.SERVER_STARTUP,
  serverId,
  { serverInfo: { name: 'my-server', version: '1.0.0' } }
)

// Log tool execution
const executionId = mcpLogger.logToolExecutionStart(
  'search_tool',
  serverId,
  requestId,
  parameters
)

mcpLogger.logToolExecutionEnd(executionId, result, error)
```

### AI SDK Logging

```typescript
import { aiSdkLogger, AiProvider, AiSdkOperation } from '@/lib/logger/ai-sdk-logger'

// Start AI operation
const operationId = aiSdkLogger.startOperation(
  AiProvider.OPENAI,
  'gpt-4',
  AiSdkOperation.MODEL_CALL,
  { requestType: 'chat' }
)

// End operation with results
aiSdkLogger.endOperation(operationId, {
  tokenUsage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
  response: result
})

// Log tool execution
aiSdkLogger.logToolExecution(
  'web_search',
  AiProvider.OPENAI,
  'gpt-4',
  { parameters, result, startTime, endTime }
)
```

### Error Handling

```typescript
import { 
  AppError, 
  ErrorCategory, 
  classifyError, 
  withErrorHandling 
} from '@/middleware/error-handler'

// Create custom errors
throw new AppError(
  'Invalid user input',
  400,
  ErrorCategory.VALIDATION,
  { retryable: false, details: { field: 'email' } }
)

// Classify existing errors
const classified = classifyError(error)
console.log(classified.category, classified.retryable)

// Wrap functions with error handling
const safeFunction = withErrorHandling(async () => {
  // Your code here
})
```

## Configuration

### Environment Variables

```bash
# Log levels
NODE_ENV=development|production|test
LOG_LEVEL=debug|info|warn|error

# Log directories
LOGS_DIR=/path/to/logs  # Default: ./logs

# Security
ENABLE_PII_DETECTION=true
ENABLE_LOG_ENCRYPTION=false
LOG_RETENTION_DAYS=30
```

### Logger Configuration

```typescript
import { appLogger, LogLevel } from '@/lib/logger'

// Update log level
appLogger.level = LogLevel.DEBUG

// Health check
const health = await appLogger.healthCheck()
console.log(health.status, health.message)
```

### Rotation Configuration

```typescript
import { logRotationManager, updateRotationConfig } from '@/lib/logger/rotation-config'

// Update rotation settings
updateRotationConfig({
  maxSize: '50m',
  retentionDays: 60,
  compress: true
})

// Get rotation stats
const stats = await logRotationManager.getRotationStats()
console.log(`Total files: ${stats.totalFiles}, Size: ${stats.totalSize}`)

// Manual cleanup
const cleanup = await logRotationManager.performCleanup()
console.log(`Deleted ${cleanup.deletedFiles.length} files`)
```

### Security Configuration

```typescript
import { logSecurity, updateSecurityConfig } from '@/lib/logger/security'

// Update security settings
logSecurity.updateConfig({
  enablePiiDetection: true,
  maskingPatterns: {
    email: true,
    apiKeys: true,
    creditCard: true
  }
})

// Check access permissions
const access = await logSecurity.checkLogAccess(userId, ['admin'])
if (access.granted) {
  // Allow log access
}

// Sanitize data
const sanitizedData = logSecurity.sanitizeData(sensitiveData)
```

## Log Viewer

### Accessing the Log Viewer

1. Navigate to `/dashboard/manager` in your application
2. Click on the "Logs" tab
3. Use filters to find specific logs:
   - **Level**: Filter by log level (error, warn, info, debug)
   - **Source**: Filter by log source (HTTP, MCP, AI_SDK, APPLICATION, SYSTEM)
   - **Search**: Full-text search across log messages and metadata
   - **Correlation ID**: Find all logs for a specific request
   - **User ID**: Find logs for a specific user
   - **Time Range**: Filter by date/time

### Features

- **Real-time Updates**: Auto-refresh every 5 seconds
- **Expandable Entries**: Click details to see full error stack traces and metadata
- **Export**: Download filtered logs as JSON or CSV
- **Pagination**: Navigate through large log sets
- **Quick Actions**: Copy correlation IDs, view related logs

## API Endpoints

### Log Query API

```bash
GET /api/logs?level=error&source=MCP&limit=100&page=1
```

Query parameters:
- `level`: Filter by log level
- `source`: Filter by log source
- `operation`: Filter by operation type
- `correlationId`: Filter by correlation ID
- `userId`: Filter by user ID
- `startTime`: Start time (ISO 8601)
- `endTime`: End time (ISO 8601)
- `search`: Search term
- `hasError`: Filter for entries with errors
- `page`: Page number (default: 1)
- `limit`: Results per page (max: 1000, default: 100)

### Export API

```bash
GET /api/logs/export?format=json&level=error
GET /api/logs/export?format=csv&startTime=2024-01-01
```

### Health Check API

```bash
GET /api/logs/health
```

Response:
```json
{
  "status": "healthy|degraded|unhealthy",
  "message": "System status message",
  "checks": {
    "fileWriteAccess": { "status": "pass", "message": "..." },
    "diskSpace": { "status": "pass", "available": 1000000, "message": "..." },
    "logRotation": { "status": "pass", "message": "..." },
    "recentErrors": { "status": "pass", "count": 0, "message": "..." },
    "loggerStatus": { "status": "pass", "message": "..." }
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## Security

### PII Protection

The logging system automatically detects and masks sensitive information:

- **Email addresses** → `[EMAIL_REDACTED]`
- **Phone numbers** → `[PHONE_REDACTED]`
- **Credit card numbers** → `[CARD_REDACTED]`
- **API keys** → `sk12***[API_KEY_REDACTED]`
- **JWT tokens** → `[JWT_REDACTED]`
- **Database URLs** → `[DB_CONNECTION_REDACTED]`

### Access Control

- Log access requires authentication and proper roles
- All access attempts are audited
- Configurable role-based permissions
- Rate limiting on log API endpoints

### Data Sanitization

Sensitive fields are automatically masked:
```typescript
const sensitiveData = {
  password: 'secret123',
  email: 'user@example.com',
  apiKey: 'sk-1234567890abcdef'
}

// Becomes:
{
  password: '[REDACTED]',
  email: '[EMAIL_REDACTED]',
  apiKey: 'sk12***[API_KEY_REDACTED]'
}
```

## Monitoring

### Health Checks

Monitor logging system health with automated checks:

- **File Write Access**: Ensures log directory is writable
- **Disk Space**: Monitors log file sizes and available space
- **Log Rotation**: Verifies rotation is working properly
- **Recent Errors**: Tracks error rates and patterns
- **Logger Status**: Confirms Winston logger is functioning

### Metrics and Alerts

Set up monitoring for:
- High error rates (>10 errors/hour = warning, >50 = critical)
- Disk space usage (>500MB = warning, >1GB = critical)
- Failed log writes
- Correlation ID tracking failures

## Troubleshooting

### Common Issues

#### Logs Not Appearing

1. Check log directory permissions:
   ```bash
   ls -la logs/
   chmod 755 logs/
   ```

2. Verify Winston configuration:
   ```typescript
   const health = await appLogger.healthCheck()
   console.log(health)
   ```

3. Check disk space:
   ```bash
   df -h
   ```

#### High Memory Usage

1. Check log rotation settings:
   ```typescript
   const stats = await logRotationManager.getRotationStats()
   console.log(`Total files: ${stats.totalFiles}`)
   ```

2. Reduce log level in production:
   ```typescript
   appLogger.level = LogLevel.INFO
   ```

3. Increase rotation frequency:
   ```typescript
   updateRotationConfig({ maxSize: '10m' })
   ```

#### Missing Correlation IDs

1. Ensure middleware is properly configured in `middleware.ts`
2. Check that `correlationMiddleware` is running first
3. Verify AsyncLocalStorage is working:
   ```typescript
   import { getCurrentCorrelationId } from '@/lib/logger/correlation'
   console.log(getCurrentCorrelationId())
   ```

#### Performance Issues

1. Reduce log level
2. Enable log compression
3. Increase rotation frequency
4. Use async logging (already enabled)

### Debug Mode

Enable debug logging:
```typescript
appLogger.level = LogLevel.DEBUG
```

This will show detailed information about:
- Middleware execution
- Correlation ID propagation
- MCP message processing
- AI SDK operations
- Error classification

### Log Analysis

Use command-line tools for quick analysis:

```bash
# Find errors in the last hour
grep '"level":"error"' logs/error-$(date +%Y-%m-%d).log | tail -10

# Count logs by level
grep -o '"level":"[^"]*"' logs/app-$(date +%Y-%m-%d).log | sort | uniq -c

# Find logs for specific correlation ID
grep '"correlationId":"abc-123"' logs/*.log

# Monitor logs in real-time
tail -f logs/app-$(date +%Y-%m-%d).log | jq .
```

## Best Practices

### Logging

1. **Use appropriate log levels**:
   - `DEBUG`: Development debugging only
   - `INFO`: General operational information
   - `WARN`: Potential issues that don't break functionality
   - `ERROR`: Errors that need attention
   - `FATAL`: Critical errors that may crash the application

2. **Include context**:
   ```typescript
   appLogger.info('User action', {
     userId,
     action: 'login',
     ip: request.ip,
     userAgent: request.headers['user-agent']
   })
   ```

3. **Don't log sensitive data**:
   - Use the security features to automatically mask PII
   - Be careful with user inputs and API responses

4. **Use correlation IDs**:
   ```typescript
   const correlationId = getCurrentCorrelationId()
   appLogger.info('Processing started', { correlationId })
   ```

### Error Handling

1. **Classify errors properly**:
   ```typescript
   throw new AppError(
     'User not found',
     404,
     ErrorCategory.NOT_FOUND,
     { retryable: false }
   )
   ```

2. **Provide useful error messages**:
   - Include enough context for debugging
   - Don't expose internal details to users

3. **Use error boundaries**:
   - Wrap components with error boundaries
   - Log errors that occur in React components

### Performance

1. **Monitor log volume**:
   - Check log rotation stats regularly
   - Adjust log levels in production

2. **Use structured logging**:
   - Include relevant metadata
   - Make logs searchable and analyzable

3. **Clean up old logs**:
   - Configure appropriate retention periods
   - Monitor disk usage

## Migration Guide

### From Console Logging

Replace console statements:
```typescript
// Before
console.log('User logged in:', userId)
console.error('Error occurred:', error)

// After
appLogger.info('User logged in', { userId })
appLogger.error('Error occurred', error)
```

### Adding to Existing Routes

Wrap API routes with logging:
```typescript
// Before
export async function POST(request: Request) {
  // handle request
}

// After
import { withRequestLogging } from '@/middleware/logging'

export const POST = withRequestLogging(async (request: Request) => {
  // handle request
})
```

## Support

For issues or questions:

1. Check the health endpoint: `/api/logs/health`
2. Review the log viewer for recent errors
3. Check this documentation for troubleshooting steps
4. Enable debug logging for detailed information

---

*Last updated: January 2024* 