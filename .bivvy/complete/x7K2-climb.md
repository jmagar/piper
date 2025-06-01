# Enhanced MCP Error Handling/Logging + MCP Log Viewer Component

<Climb>
  <header>
    <id>x7K2</id>
    <type>feature</type>
    <description>Comprehensive app-wide logging and error handling system with specialized MCP and AI SDK support</description>
  </header>
  
  <newDependencies>
    - winston (for structured logging)
    - winston-daily-rotate-file (for log rotation)
    - @types/express (if not already present)
    - uuid (for correlation IDs)
  </newDependencies>
  
  <prerequisiteChanges>
    - Review existing error handling patterns in the codebase
    - Ensure middleware.ts can be extended for logging
    - Verify /logs directory can be created and written to
    - Check current MCP server implementations for logging integration points
  </prerequisiteChanges>
  
  <relevantFiles>
    - middleware.ts (main app middleware)
    - app/api/*/route.ts (API routes that need error handling)
    - lib/mcp/ (MCP-related files)
    - lib/tools/ (AI SDK tool implementations)
    - lib/agents/tools/ (agent tool implementations)
    - app/components/mcp-servers/ (MCP UI components)
    - lib/server/ (server utilities)
  </relevantFiles>
  
  <everythingElse>
## Feature Overview

This feature implements a comprehensive, production-ready logging and error handling system that provides:

- **Centralized Logging**: All logs stored in `/logs` with structured JSON format
- **Error Classification**: Intelligent categorization of errors (MCP, AI SDK, HTTP, etc.)
- **Correlation Tracking**: Request IDs for tracing requests across the application
- **MCP Protocol Support**: Specialized handling for MCP JSON-RPC errors and logging
- **AI SDK Integration**: Error handling for tool execution and streaming operations
- **Log Viewer Component**: React component for viewing and filtering logs
- **Automated Log Rotation**: Prevent disk space issues with daily rotation
- **Security-First**: No sensitive data exposure in logs

## Problem Being Solved

Currently, the application lacks centralized error handling and logging, making debugging difficult and providing no visibility into MCP server operations, AI SDK tool failures, or general application health.

## Success Metrics

- All errors are captured and logged with proper context
- MCP server operations are fully traceable
- AI SDK tool execution is monitored and debuggable
- Developers can quickly identify and resolve issues
- No sensitive data is exposed in logs
- Log storage is managed efficiently

## Technical Requirements

### Core Logging Infrastructure
- Winston-based logger with multiple transports
- Structured JSON logging format
- Log levels: DEBUG, INFO, WARN, ERROR, FATAL
- Daily log rotation with 30-day retention
- File-based storage in `/logs` directory
- Correlation ID propagation through request lifecycle

### Error Handling Layers
1. **Global Express/Next.js Middleware**: Catch unhandled errors
2. **MCP Error Handler**: JSON-RPC error standardization
3. **AI SDK Error Handler**: Tool execution and streaming errors
4. **API Route Wrapper**: Consistent error responses
5. **Client-Side Error Boundary**: React error handling

### MCP-Specific Features
- Log all MCP server lifecycle events (init, tool calls, resource access)
- JSON-RPC error code mapping and standardization
- Transport-specific error handling (stdio vs HTTP)
- Server capability negotiation logging
- Tool execution timing and result logging

### AI SDK Integration
- Tool execution error capture and categorization
- Streaming error handling for both simple and full streams
- Model provider error classification
- Token usage and cost tracking
- Request/response logging with privacy protection

### Log Viewer Component
- Real-time log streaming interface
- Filtering by log level, source, correlation ID
- Search functionality across log entries
- Export capabilities for debugging
- Responsive design for mobile debugging

## Implementation Architecture

### Directory Structure
```
lib/logger/
├── index.ts              # Main logger service
├── error-handler.ts      # Error classification and handling
├── mcp-logger.ts         # MCP-specific logging utilities
├── ai-sdk-logger.ts      # AI SDK logging utilities
├── correlation.ts        # Correlation ID management
└── types.ts              # Logging type definitions

middleware/
├── logging.ts            # Request/response logging
├── error-handler.ts      # Global error handling
└── correlation.ts        # Correlation ID middleware

components/
└── log-viewer/
    ├── index.tsx         # Main log viewer component
    ├── log-filters.tsx   # Filtering controls
    ├── log-entry.tsx     # Individual log entry component
    └── log-stream.tsx    # Real-time streaming component

/logs/
├── app.log               # General application logs
├── error.log             # Error-specific logs  
├── mcp.log               # MCP protocol logs
├── ai-sdk.log            # AI SDK operation logs
├── http.log              # HTTP request/response logs
└── archived/             # Rotated logs
```

### Logger Configuration
- Environment-based log levels (DEBUG in dev, INFO in prod)
- Configurable log retention policies
- Performance-optimized async logging
- Health check endpoints for log system status
- Integration with existing monitoring (if any)

### Error Context Enrichment
- Request metadata (user agent, IP, route)
- User context (if authenticated)
- System state (memory usage, active connections)
- Timing information (request duration, DB query time)
- Stack traces with source maps (in development)

### Security Considerations
- PII detection and masking
- API key and secret redaction
- User data sanitization
- Access control for log viewer
- Audit trail for log access

## Integration Points

### MCP Server Integration
- Wrap all MCP server method calls with logging
- Log server startup, shutdown, and health checks
- Track tool execution metrics and failures
- Monitor resource access patterns
- Log capability negotiations and version mismatches

### AI SDK Integration  
- Wrap all AI SDK operations with error handling
- Log model provider responses and errors
- Track token usage and costs per request
- Monitor streaming operation health
- Log tool execution results and timing

### Next.js Integration
- Extend existing middleware.ts for logging
- Add error boundaries to key components
- Integrate with API route handlers
- Support both App Router and Pages Router patterns
- SSR-compatible logging implementation

## Development Approach

### Phase 1: Core Infrastructure
1. Set up Winston logger with file transports
2. Implement correlation ID system
3. Create base error handling middleware
4. Establish log directory structure

### Phase 2: MCP Integration
1. Add MCP-specific error handling
2. Implement JSON-RPC error standardization
3. Add server lifecycle logging
4. Create tool execution monitoring

### Phase 3: AI SDK Integration
1. Wrap AI SDK operations with error handling
2. Implement streaming error capture
3. Add model provider error classification
4. Create usage tracking and logging

### Phase 4: Log Viewer Component
1. Build basic log viewing interface
2. Add filtering and search capabilities
3. Implement real-time log streaming
4. Add export and debugging features

### Phase 5: Testing and Optimization
1. Load testing for log performance
2. Error injection testing
3. Log viewer usability testing
4. Performance optimization

## Monitoring and Alerting

### Health Checks
- Log system availability endpoint
- Disk space monitoring for `/logs`
- Log file corruption detection
- Error rate thresholds and alerting

### Metrics Collection
- Error rates by category and source
- MCP server performance metrics
- AI SDK usage and cost tracking
- Log volume and storage utilization

## Future Enhancements

- Integration with external log aggregation (ELK, Splunk)
- Real-time alerting for critical errors
- Advanced analytics and dashboards
- Machine learning for error pattern detection
- Distributed tracing support
  </everythingElse>
</Climb> 