# Enhanced MCP Client - Unified Documentation

## Overview

The Enhanced MCP Client is a production-ready implementation built on top of the AI SDK's `experimental_createMCPClient` that provides robust error handling, comprehensive metrics collection, and advanced configuration options for Model Context Protocol (MCP) integrations in the Piper application.

## 🏗️ **Current Architecture (As Implemented)**

```mermaid
graph TD
    A[Chat API] --> B[getCombinedMCPToolsForAISDK]
    B --> C[MCPService Enhanced]
    B --> D[loadMCPToolsFromURL Enhanced]
    
    C --> E[Enhanced Stdio Client]
    D --> F[Enhanced SSE Client]
    
    E --> G[MCPMetricsCollector]
    F --> G
    
    G --> H[PostgreSQL Database]
    
    I[Enhanced Integration Helper] --> G
    J[MCP Metrics API] --> I
    
    K[Connection Pool] --> E
    K --> F
```

## ✅ **Implemented Features**

### **1. Enhanced Error Handling**
- **Custom Error Types**: `MCPClientError` and `CallToolError` with specific error codes
- **Enhanced Error Context**: Comprehensive error logging with correlation IDs
- **Graceful Degradation**: System continues to work when MCP servers fail
- **Error Categorization**: Different handling for timeout, connection, and execution errors

### **2. Transport Support**
- **✅ STDIO Transport**: Fully implemented with `createEnhancedStdioMCPClient`
- **✅ SSE Transport**: Fully implemented with `createEnhancedSSEMCPClient`
- **🔧 StreamableHTTP Transport**: Basic implementation exists but not actively used

### **3. Metrics Collection & Persistence**
- **✅ Database Integration**: Uses PostgreSQL with Prisma for metrics storage
- **✅ Server Metrics**: Connection tracking, status monitoring, tool counts
- **✅ Tool Execution Metrics**: Performance tracking, success/failure rates
- **✅ Real-time Health Checks**: System health monitoring and recommendations

#### **Database Schema (Production)**
```sql
-- Server Metrics
model MCPServerMetric {
  id                String    @id @default(uuid())
  serverId          String    // Unique identifier
  serverName        String    // Human-readable name
  transportType     String    // 'stdio', 'sse', 'streamable-http'
  status            String    // 'connected', 'disconnected', 'error'
  connectionTime    DateTime
  lastActiveAt      DateTime?
  errorCount        Int       @default(0)
  totalRequests     Int       @default(0)
  averageLatency    Float     @default(0)
  toolsCount        Int       @default(0)
  metadata          Json?
  toolExecutions    MCPToolExecution[]
}

-- Tool Execution Tracking
model MCPToolExecution {
  id               String    @id @default(uuid())
  serverId         String
  toolName         String
  executionTime    Float     // milliseconds
  success          Boolean
  errorType        String?
  errorMessage     String?
  repairAttempts   Int       @default(0)
  metadata         Json?
  executedAt       DateTime  @default(now())
}
```

### **4. Connection Management**
- **✅ Connection Pooling**: `globalMCPPool` manages multiple client connections
- **✅ Lifecycle Management**: Proper startup, shutdown, and cleanup procedures
- **✅ Resource Cleanup**: Automatic cleanup on process exit and errors
- **✅ Health Monitoring**: Real-time connection status tracking

### **5. Enhanced Configuration**
- **✅ Environment Integration**: Full support for environment variables
- **✅ Client Identification**: Proper client naming for debugging
- **✅ Timeout Handling**: Configurable timeouts for connections and operations
- **✅ Custom Headers**: Support for authentication in SSE transport

## 🏗️ **Core Implementation Files**

### **Primary Implementation**
- **`lib/mcp/enhanced-mcp-client.ts`** - Core enhanced client implementation
- **`lib/mcp/client.ts`** - MCPService class using enhanced client
- **`lib/mcp/mcpManager.ts`** - Server management and tool aggregation
- **`lib/mcp/enhanced-integration.ts`** - Metrics and health integration
- **`lib/mcp/load-mcp-from-url.ts`** - Enhanced SSE client wrapper

### **API Endpoints**
- **`app/api/mcp-metrics/route.ts`** - Enhanced metrics endpoint
- **`app/api/mcp-servers/route.ts`** - Server status and management
- **`app/api/mcp-tools-available/route.ts`** - Available tools listing

### **Database Integration**
- **`prisma/schema.prisma`** - MCPServerMetric and MCPToolExecution models

## 🚀 **Production Usage**

### **1. Chat Integration**
The Enhanced MCP Client is actively used in the chat API:

```typescript
// In app/api/chat/route.ts
const mcpTools = await getCombinedMCPToolsForAISDK()
const allTools = { ...localTools, ...mcpTools }

const result = await streamText({
  model: selectedModel,
  messages: convertToModelMessages(messages),
  tools: allTools
})
```

### **2. Server Management**
Servers are managed through the MCPService class:

```typescript
// Each server gets an MCPService instance
const service = new MCPService(serverConfig, serverKey)
const { status, tools, errorDetails } = await service.fetchToolsAndStatus()
```

### **3. Tool Execution**

#### **SSE Tools** (AI SDK Native)
```typescript
// SSE tools are handled automatically by AI SDK
const { tools } = await loadMCPToolsFromURL(sseConfig.url)
// Tools work automatically through AI SDK
```

#### **STDIO Tools** (Direct MCP Protocol)
```typescript
// STDIO tools use direct MCP protocol communication
const result = await mcpService.invokeTool(toolName, args)
```

## 📊 **Monitoring & Observability**

### **Metrics API**
```http
GET /api/mcp-metrics
```

**Response Structure:**
```json
{
  "success": true,
  "timestamp": "2024-01-20T10:30:00Z",
  "data": {
    "metrics": {
      "servers": [...],
      "summary": {
        "totalServers": 5,
        "connectedServers": 4,
        "totalTools": 107,
        "errorServers": 1
      }
    },
    "health": {
      "status": "healthy",
      "details": {...},
      "recommendations": []
    },
    "pool": {
      "totalConnections": 4,
      "activeClients": [...]
    }
  }
}
```

### **Health Check System**
```typescript
const healthCheck = await performMCPHealthCheck()
// Returns: 'healthy' | 'degraded' | 'unhealthy'
```

## 🔧 **Configuration**

### **Environment Variables**
```bash
# Database (Required)
DATABASE_URL="postgresql://user:pass@localhost:5432/piper"

# Redis (Required)
REDIS_URL="redis://localhost:6379"

# MCP Configuration
CONFIG_DIR="/config"  # Must contain config.json

# Optional Settings
UPLOADS_DIR="/app/uploads"
MCP_REPAIR_MODEL="gpt-4o-mini"
MCP_MAX_REPAIR_ATTEMPTS="3"
```

### **Server Configuration (config.json)**
```json
{
  "mcpServers": {
    "filesystem": {
      "label": "File System",
      "transport": {
        "type": "stdio",
        "command": "mcp-server-filesystem",
        "args": ["--root", "/workspace"]
      }
    },
    "crawl4mcp": {
      "label": "Web Crawling",
      "transport": {
        "type": "sse",
        "url": "https://piper.tootie.tv/mcp/crawl4mcp"
      }
    }
  }
}
```

## 🎯 **What's Working in Production**

### **✅ Active Features**
1. **Enhanced Error Handling** - All MCP operations have comprehensive error handling
2. **Real-time Metrics** - Server connections and tool executions are tracked in database
3. **Connection Pooling** - Multiple servers managed efficiently
4. **Health Monitoring** - System health is continuously monitored
5. **Tool Integration** - Both SSE and STDIO tools work seamlessly in chat
6. **Backward Compatibility** - All existing MCP functionality preserved

### **✅ API Endpoints Working**
- `/api/mcp-metrics` - Real-time metrics and health status
- `/api/mcp-servers` - Server status and management
- `/api/mcp-tools-available` - Available tools from all servers

### **✅ Database Integration**
- 24+ server metrics records with real server data
- Tool execution tracking ready (populates when tools are used)
- Historical analysis and performance monitoring

## 🔮 **Planned Features (Not Yet Implemented)**

### **Tool Call Repair System**
While the infrastructure exists, the AI-powered tool call repair is not actively used:

```typescript
// Infrastructure exists but not enabled
class ToolCallRepairer {
  async repairToolCall(context: ToolCallRepairContext): Promise<ToolCallRepairResult>
  // Uses GPT-4o-mini for intelligent argument fixes
}
```

### **Multi-Modal Content Support**
Basic infrastructure exists but not actively used:

```typescript
// Ready for implementation
class MultiModalContentHandler {
  static async processContent(content: MultiModalContent): Promise<MultiModalContent>
  // Supports images, audio, video, files
}
```

### **Advanced Caching**
- Tool result caching with TTL
- Schema validation caching
- Connection metadata caching

## 📋 **Usage Examples**

### **Creating Enhanced Clients**

#### **STDIO Client**
```typescript
import { createEnhancedStdioMCPClient } from '@/lib/mcp/enhanced-mcp-client'

const client = await createEnhancedStdioMCPClient({
  command: 'mcp-server-filesystem',
  args: ['--root', '/workspace'],
  clientName: 'piper-client',
  timeout: 30000
})
```

#### **SSE Client**
```typescript
import { createEnhancedSSEMCPClient } from '@/lib/mcp/enhanced-mcp-client'

const client = await createEnhancedSSEMCPClient({
  url: 'https://api.example.com/mcp',
  headers: { 'Authorization': 'Bearer token' },
  clientName: 'piper-client'
})
```

### **Using the Connection Pool**
```typescript
import { globalMCPPool } from '@/lib/mcp/enhanced-mcp-client'

// Add clients
await globalMCPPool.addStdioClient('server1', stdioConfig)
await globalMCPPool.addSSEClient('server2', sseConfig)

// Get statistics
const stats = globalMCPPool.getStats()
```

### **Accessing Metrics**
```typescript
import { MCPMetricsCollector } from '@/lib/mcp/enhanced-mcp-client'

const collector = new MCPMetricsCollector(true)

// Record server connection
await collector.recordServerConnection(
  'server-id',
  'Server Name', 
  'stdio',
  10 // tool count
)

// Get server metrics
const metrics = await collector.getServerMetrics('server-id')
```

## 🔍 **Troubleshooting**

### **Common Issues**

#### **Connection Failures**
```typescript
// Check logs for Enhanced MCP client initialization
// Logs will show: "[Enhanced MCP] Creating stdio/sse client"
// Success: "[Enhanced MCP] Successfully connected to MCP server"
```

#### **Metrics Not Recording**
```typescript
// Verify database connection and Prisma setup
// Check MCPMetricsCollector initialization
const collector = new MCPMetricsCollector(true) // enabled = true
```

#### **Tool Execution Failures**
```typescript
// For STDIO tools, check MCPService.invokeTool logs
// For SSE tools, they're handled by AI SDK automatically
```

### **Debug Logging**
```typescript
// Enable enhanced MCP debug logging
process.env.MCP_DEBUG = 'true'
process.env.LOG_LEVEL = 'debug'
```

## 🏁 **Summary**

The Enhanced MCP Client is **fully operational** in production with:

- ✅ **Enterprise-grade reliability** through comprehensive error handling
- ✅ **Real-time monitoring** with PostgreSQL-backed metrics
- ✅ **Production-ready architecture** supporting both STDIO and SSE transports
- ✅ **Backward compatibility** with all existing MCP functionality
- ✅ **Active tool integration** serving 100+ tools across multiple servers

The system successfully bridges basic MCP functionality with enterprise requirements, providing robust error handling, comprehensive monitoring, and production-ready reliability while maintaining full compatibility with existing code.

## 📚 **Related Documentation**

- [AI SDK MCP Documentation](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling)
- [Model Context Protocol Specification](https://modelcontextprotocol.io/specification/)
- [Piper Logging System](./logging-system.md)
- [Database Schema](../prisma/schema.prisma) 