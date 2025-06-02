**STARTFILE 9mK7-climb.md**
<Climb>
  <header>
    <id>9mK7</id>
    <type>feature</type>
    <description>Advanced MCP Client Enhancements - StreamableHTTP Transport, Tool Call Repair, Multi-Modal Results, Abort Signals, Monitoring Integration, and Configuration Hot Reloading</description>
  </header>
  <newDependencies>
    - @modelcontextprotocol/sdk (for StreamableHTTPClientTransport)
    - zod (already present, but may need version compatibility check)
  </newDependencies>
  <prerequisiteChanges>
    - Enhanced MCP client base implementation must be in place
    - Piper logging system integration
    - Configuration management system (config.json)
    - Dashboard architecture for monitoring integration
  </prerequisiteChanges>
  <relevantFiles>
    - lib/mcp/enhanced-mcp-client.ts (main implementation)
    - lib/mcp/mcpManager.ts (integration point)
    - lib/config.ts (configuration management)
    - app/components/mcp-servers/ (dashboard components)
    - app/api/mcp-config/ (configuration API)
    - config.json (MCP server definitions)
  </relevantFiles>
  <everythingElse>

## Feature Overview

### Feature Name and ID
Advanced MCP Client Enhancements (ID: 9mK7)

### Purpose Statement
Enhance Piper's MCP client with enterprise-grade features including additional transport protocols, intelligent error recovery, rich content support, operation cancellation, real-time monitoring, and dynamic configuration management.

### Problem Being Solved
1. **Limited Transport Options**: Current client only supports stdio and SSE, missing StreamableHTTP
2. **Error Recovery**: No automatic repair for malformed tool calls or network issues
3. **Content Limitations**: Basic text-only tool results, no multi-modal support
4. **Operation Control**: No way to cancel long-running MCP operations
5. **Monitoring Gaps**: Limited real-time visibility into MCP server health and performance
6. **Configuration Rigidity**: MCP configuration requires application restart to change

### Success Metrics
- StreamableHTTP transport functional with official MCP SDK
- Tool call repair reduces error rates by >50%
- Multi-modal content rendering in chat interface
- Abort signal cancels operations within 1 second
- Real-time dashboard shows server health with <5 second latency
- Configuration hot reload completes within 3 seconds without downtime

## Requirements

### Functional Requirements

#### 1. StreamableHTTP Transport Support
- Support StreamableHTTPClientTransport from @modelcontextprotocol/sdk
- Full compatibility with existing transport configuration patterns
- Session management for persistent connections
- Custom headers and authentication support

#### 2. Tool Call Repair & Recovery
- Automatic detection of malformed tool calls
- AI-powered repair using fallback model (GPT-4o-mini)
- Configurable repair strategies: retry, skip, error
- Maximum repair attempts with exponential backoff
- Detailed repair attempt logging

#### 3. Multi-Modal Tool Results
- Support for images, files, and rich content in tool responses
- MIME type detection and handling
- Secure file serving for uploaded content
- Integration with chat interface for rich rendering
- Content sanitization and security validation

#### 4. Abort Signal Support
- AbortController integration for all MCP operations
- Graceful cancellation of long-running operations
- Timeout-based automatic cancellation
- Resource cleanup on abort
- Client-side and server-side abort handling

#### 5. Enhanced Monitoring Dashboard Integration
- Real-time server health monitoring
- Tool usage statistics and performance metrics
- Error analysis and trending
- Connection status visualization
- Performance bottleneck identification

#### 6. Configuration Hot Reloading
- File system watcher for config.json changes
- Graceful server restarts without connection loss
- Validation before applying new configuration
- Rollback capability for failed configurations
- Event notifications for configuration changes

### Technical Requirements
- Maintain backward compatibility with existing MCP client
- TypeScript type safety for all new features
- Performance: <100ms latency overhead for enhancements
- Security: Input validation and sanitization for all features
- Reliability: 99.9% uptime for configuration reloading
- Memory efficiency: <10MB additional memory usage

### User Requirements
- Transparent operation - users shouldn't notice the enhancements unless they fail
- Clear error messages for configuration and connection issues
- Visual feedback for long-running operations with cancel options
- Dashboard provides actionable insights for MCP troubleshooting

## Design and Implementation

### User Flow
1. **Configuration**: Admin configures new transport types and repair settings
2. **Connection**: Enhanced client automatically selects optimal transport
3. **Operation**: Tools execute with abort capability and repair fallback
4. **Monitoring**: Dashboard shows real-time status and metrics
5. **Maintenance**: Configuration updates applied without service interruption

### Architecture Overview
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Dashboard     │◄───┤  Enhanced MCP    │◄───┤   Config        │
│   Components    │    │  Client          │    │   Watcher       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Transport      │◄───┤  Connection      │◄───┤   Tool Call     │
│  Managers       │    │  Pool            │    │   Repair        │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Dependent Components
- Winston logging system for structured logging
- Prisma/PostgreSQL for metrics storage
- React dashboard components for monitoring UI
- File system watcher (fs.watch) for configuration monitoring
- AbortController web API for cancellation

### API Specifications

#### Enhanced Transport Configuration
```typescript
interface StreamableHTTPTransportConfig {
  type: 'streamable-http'
  url: string
  sessionId?: string
  headers?: Record<string, string>
  timeout?: number
}
```

#### Tool Call Repair Configuration
```typescript
interface ToolCallRepairConfig {
  enabled: boolean
  repairModel: string
  maxRepairAttempts: number
  fallbackStrategy: 'skip' | 'error' | 'retry'
  repairTimeout: number
}
```

#### Multi-Modal Result Types
```typescript
interface MultiModalToolResult {
  text?: string
  images?: Array<{ url: string; alt?: string; mimeType: string }>
  files?: Array<{ name: string; content: string; mimeType: string }>
  data?: any
  metadata?: Record<string, any>
}
```

### Data Models

#### MCP Metrics Storage
```sql
CREATE TABLE mcp_server_metrics (
  id SERIAL PRIMARY KEY,
  server_key VARCHAR(255) NOT NULL,
  metric_type VARCHAR(50) NOT NULL,
  metric_value DECIMAL(10,4),
  metadata JSON,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE mcp_tool_executions (
  id SERIAL PRIMARY KEY,
  server_key VARCHAR(255) NOT NULL,
  tool_name VARCHAR(255) NOT NULL,
  execution_time_ms INTEGER,
  success BOOLEAN,
  error_message TEXT,
  repair_attempts INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Development Details

### Implementation Considerations
1. **Transport Abstraction**: Create unified interface for all transport types
2. **Error Boundaries**: Wrap all MCP operations in error boundaries
3. **Resource Management**: Ensure proper cleanup for all async operations
4. **Type Safety**: Use discriminated unions for transport configurations
5. **Performance**: Implement connection pooling and request batching
6. **Security**: Validate all external inputs and sanitize file uploads

### Dependencies
- @modelcontextprotocol/sdk: Official MCP TypeScript SDK
- AbortController polyfill for older Node.js versions
- File type detection library for multi-modal content
- WebSocket library for enhanced SSE transport
- File system watcher (chokidar) for cross-platform compatibility

### Security Considerations
- Validate all StreamableHTTP URLs to prevent SSRF attacks
- Sanitize file uploads and implement size limits
- Secure file serving with proper MIME type detection
- Rate limiting for repair attempts to prevent abuse
- Input validation for all configuration parameters

## Testing Approach

### Test Cases
1. **Transport Tests**: Verify all transport types connect and communicate
2. **Repair Tests**: Test tool call repair with various malformed inputs
3. **Multi-Modal Tests**: Validate file upload, processing, and serving
4. **Abort Tests**: Ensure operations cancel within timeout limits
5. **Monitoring Tests**: Verify metrics collection and dashboard updates
6. **Config Tests**: Test hot reload with valid and invalid configurations

### Acceptance Criteria
- All transport types successfully load tools from test servers
- Tool call repair recovers from at least 3 types of common errors
- Multi-modal content renders correctly in chat interface
- Abort signals cancel operations without resource leaks
- Dashboard shows real-time updates within 5 seconds
- Configuration changes apply without dropping existing connections

### Edge Cases
- Network interruption during StreamableHTTP transport
- Repair attempts exceed maximum limit
- Large file uploads (>10MB)
- Rapid configuration changes (multiple per second)
- Simultaneous abort signals from multiple sources
- Server shutdown during configuration reload

### Performance Requirements
- Transport initialization: <2 seconds
- Tool call repair: <5 seconds total
- Multi-modal content loading: <3 seconds
- Abort signal response: <1 second
- Configuration reload: <3 seconds
- Dashboard metric updates: <5 seconds

## Design Assets

### Monitoring Dashboard Components
- Server status grid with color-coded health indicators
- Real-time metrics charts (tool usage, response times, error rates)
- Configuration management panel with validation feedback
- Tool execution timeline with filtering capabilities
- Error analysis dashboard with categorization and trends

### User Interface Guidelines
- Consistent color scheme for server status (green/yellow/red)
- Loading indicators for long-running operations with cancel buttons
- Toast notifications for configuration changes and errors
- Accessibility compliance for all dashboard components
- Responsive design for mobile dashboard access

## Future Considerations

### Scalability Plans
- Horizontal scaling for multiple MCP server instances
- Load balancing for high-traffic tool executions
- Distributed monitoring across multiple application instances
- Configuration synchronization across server clusters

### Enhancement Ideas
- Machine learning for predictive tool call repair
- Advanced analytics and usage pattern detection
- Integration with external monitoring systems (Prometheus, Grafana)
- Custom transport protocol development
- Tool recommendation engine based on usage patterns

### Known Limitations
- StreamableHTTP transport depends on external SDK compatibility
- Tool call repair effectiveness varies by model capabilities
- Multi-modal content limited by browser capabilities
- Configuration hot reload may cause brief latency spikes
- Monitoring dashboard requires additional memory allocation

  </everythingElse>
</Climb>
**ENDFILE** 