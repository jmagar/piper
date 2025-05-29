# System Patterns: Piper Production Architecture

## Core Architecture

### **Next.js Foundation**
- **Frontend**: React components with streaming chat interface (`app/components/chat/`)
- **API Routes**: RESTful endpoints for chat (`app/api/chat/route.ts`) and MCP management (`app/api/mcp-servers/route.ts`)
- **Middleware**: TypeScript-based request handling with proper error boundaries
- **State Management**: React hooks with Vercel AI SDK integration for real-time streaming

### **Production Infrastructure**
- **Docker Deployment**: Multi-container setup with proper networking and persistence
- **Database**: PostgreSQL with Prisma ORM for chat history and user management
- **Caching**: Redis for MCP server status and performance optimization
- **Environment**: Production-ready .env configuration with secrets management

## MCP Management Architecture

### **MCPService Pattern (`lib/mcp/client.ts`)**
```typescript
class MCPService {
  // Complete MCP 2024-11-05 protocol implementation
  async initialize() {
    // 1. Send initialize request
    // 2. Receive initialization response  
    // 3. Send initialized notification ← CRITICAL
  }
  
  async invokeTool(toolName: string, args: Record<string, unknown>) {
    // Direct MCP client invocation with proper error handling
  }
}
```

### **MCPManager Orchestration (`lib/mcp/mcpManager.ts`)**
- **Service Discovery**: Auto-discovery from `config.json` with transport-specific initialization
- **Tool Registration**: Dynamic tool definition creation for Vercel AI SDK
- **Performance Processing**: Automatic chunking of large responses (>5k characters)
- **Status Management**: Redis-cached status with periodic polling (60s intervals)
- **HMR Support**: Development-friendly state persistence on `globalThis`

## Advanced Performance Patterns

### **Chunked Response Processing**
```typescript
function processLargeToolResponse(toolName: string, result: unknown): ChunkedContent {
  // Tool-specific processors:
  if (toolName === 'fetch') return processFetchResponse(result);        // HTML → Structured
  if (toolName.includes('search')) return processSearchResponse(result); // JSON → Summaries  
  return processGenericLargeResponse(result);                            // Text → Chunks
}
```

#### **HTML Content Processing (Fetch Tool)**
- **Title Extraction**: `<title>` tag parsing with fallbacks
- **Meta Description**: SEO description extraction for summaries
- **Content Cleaning**: Remove scripts, styles, navigation, footer noise
- **Heading Structure**: Extract H1-H6 tags for content organization
- **Chunked Output**: Max 2000 chars per section with importance ranking

#### **Search Result Processing**
- **JSON Detection**: Auto-parse search API responses
- **Result Prioritization**: First 5 results with importance weighting
- **Content Truncation**: 500 char limits per result with smart truncation
- **Metadata Preservation**: URLs, titles, descriptions maintained

## Docker Production Patterns

### **Unraid Networking Pattern**
```yaml
# Host IP Resolution (Critical for Unraid)
services:
  piper-app:
    environment:
      - MCP_SERVER_URLS=http://10.1.0.2:PORT  # NOT localhost
```

### **Python MCP Server Support**
```dockerfile
# UV Installation Pattern (Required for Python MCP servers)
RUN curl -LsSf https://astral.sh/uv/install.sh | sh && \
    mv ~/.local/bin/uv* /usr/local/bin/
```

### **Redis Configuration**
```yaml
# No-Auth Redis Pattern
redis:
  command: redis-server --save 20 1 --loglevel warning
  # No requirepass - clean state preferred
```

## Tool Execution Flow (Production)

### **Complete Tool Invocation Pipeline**
1. **AI Model Decision**
   - Vercel AI SDK identifies tool need
   - Generates structured tool call with parameters

2. **Tool Execution Bridge**
   ```typescript
   tool({
     execute: async (args) => {
       const mcpService = getManagedClient(serverKey);
       const result = await mcpService.invokeTool(toolName, args);
       return processLargeToolResponse(toolName, result); // ← Performance optimization
     }
   })
   ```

3. **MCP Protocol Communication**
   - Complete handshake: `initialize` → response → `initialized` notification
   - Direct tool invocation via `mcpClient.invoke(toolName, args)`
   - Proper error handling with fallback mechanisms

4. **Response Processing**
   - Large response detection (>5k characters)
   - Tool-specific processing (HTML, JSON, text)
   - Structured output with metadata preservation

5. **AI Integration**
   - Processed results flow to AI SDK
   - `maxTokens: 8096` for optimal balance
   - Streaming response generation

## Key Technical Patterns

### **MCP Protocol Implementation**
- **Critical Handshake**: Must send `initialized` notification after initialization response
- **Transport Abstraction**: Support for stdio (local) and SSE (HTTP) transports
- **Error Recovery**: Graceful handling of connection failures and retries

### **Performance Optimization**
- **Chunked Processing**: Transform 64k character responses → 2.5k structured summaries
- **Importance Ranking**: High/Medium/Low priority sections for AI processing
- **Token Management**: Balance between completeness and processing speed

### **Development Patterns**
- **HMR Persistence**: Store MCP services on `globalThis` for hot reloading
- **Polling Management**: Prevent duplicate intervals during development
- **Type Safety**: Comprehensive TypeScript with proper schema validation

### **Production Reliability**
- **Health Monitoring**: Redis-cached status with periodic updates
- **Error Boundaries**: Comprehensive error handling at all levels
- **Graceful Degradation**: Continue operation when individual tools fail
- **Logging Strategy**: Detailed logs for debugging without performance impact

## Deployment Architecture

### **Container Organization**
- **piper-app**: Main application with MCP management
- **piper-db**: PostgreSQL with persistent volumes
- **piper-cache**: Redis for status caching and session management

### **Network Security**
- **Internal Communication**: Docker network for database/cache
- **External Access**: Controlled port exposure (8630)
- **MCP Connections**: Proper firewall configuration for tool access

### **Data Persistence**
- **Database**: Chat history, user preferences, agent configurations
- **Redis Cache**: MCP server status, temporary session data
- **File Uploads**: Persistent volume mounting for user content

## Error Handling Patterns

### **Tool Execution Errors**
```typescript
// Never throw - always return error objects for AI processing
return {
  error: true,
  message: error.message,
  toolName: toolName,
  serverKey: server.key
};
```

### **MCP Connection Failures**
- **Automatic Retry**: Exponential backoff for connection attempts
- **Status Caching**: Redis fallback when servers are temporarily unavailable
- **Graceful Degradation**: Disable individual tools while maintaining overall functionality