# System Patterns: Piper Application Design

## Core Architectural Principles

- **Modularity**: Separation of concerns (UI, API, MCP management, services)
- **Extensibility**: Easy to add new LLM providers and MCP tools
- **Resilience**: Robust error handling and graceful degradation
- **Performance**: Efficient processing, caching, and optimized builds
- **Developer Experience**: HMR, clear logging, type safety

## Key System Components & Interactions

### **1. Frontend (Next.js App Router)**
- **UI Layer**: React components, `useChat` hook for interactivity
- **API Communication**: Calls Next.js API routes for backend logic
- **State Management**: Primarily through `useChat` and component state

### **2. Backend (Next.js API Routes)**
- **Request Handling**: Processes requests from the frontend
- **LLM Interaction**: Uses Vercel AI SDK (`streamText`) to call LLMs
- **Tool Orchestration**: Provides tool definitions to LLMs via `MCPManager`
- **Response Streaming**: Streams LLM responses and tool results back to UI

### **3. MCP Manager (`lib/mcp/mcpManager.ts`)**
- **Singleton Service**: Manages all `MCPService` instances
- **Initialization**: Discovers MCP servers from `config.json`, initializes clients
- **Tool Aggregation**: Collects tools from all active `MCPService`s via dual approach:
  - **SSE Tools**: Uses `loadMCPToolsFromURL` utility for AI SDK integration
  - **STDIO Tools**: Manual tool wrapping with `execute` functions
- **Health Monitoring**: Polls MCP servers, caches status in Redis
- **Backward Compatibility**: Handles both legacy (`url` field) and new (`transport` object) config formats

### **4. MCP Service (`lib/mcp/client.ts`)**
- **Individual Server Client**: Manages connection and communication with one MCP server
- **Protocol Handling**: Implements MCP handshake (`tools/list`, `initialized`)
- **Transport Layer**: Supports `stdio` and `sse`
  - **stdio**: Spawns and communicates with local MCP server processes
  - **sse**: Connects to remote MCP servers via Server-Sent Events
- **Tool Execution**: Contains the logic to actually call tools for STDIO servers only

### **MCP (Model Context Protocol)**

Piper integrates with external tools and services via MCP servers. Communication can occur over standard I/O (stdio) or Server-Sent Events (SSE).

#### **Dual Transport Pattern (STDIO vs SSE)**

**STDIO Tool Integration (Manual Invocation)**:
```typescript
// For STDIO servers - requires manual tool wrapping
combinedTools[toolName] = tool({
  description: toolDef.description,
  parameters: jsonSchema(params),
  execute: async (args: unknown) => {
    const mcpService = getManagedClient(server.key);
    return await mcpService.invokeTool(toolDef.name, args);
  }
});
```

**SSE Tool Integration (AI SDK Automatic)**:
```typescript
// For SSE servers - use loadMCPToolsFromURL utility
const { loadMCPToolsFromURL } = await import('./load-mcp-from-url');
const { tools: mcpTools } = await loadMCPToolsFromURL(transport.url);

// Add tools directly - AI SDK handles invocation automatically
Object.entries(mcpTools).forEach(([toolName, toolDefinition]) => {
  combinedTools[`${serverKey}_${toolName}`] = toolDefinition;
});
```

#### **Transport Object Creation Pattern**
```typescript
// Handle both legacy and new config formats
let transport = serverConfig.transport;
if (!transport && serverConfig.url) {
  // Create transport object for legacy config format
  transport = {
    type: 'sse',
    url: serverConfig.url,
    headers: serverConfig.headers
  };
}
```

#### **Key Differences Between Transports**
- **STDIO**: Local processes, direct invocation via `MCPService.invokeTool()`
- **SSE**: Remote HTTP endpoints, AI SDK handles invocation automatically
- **Tool Format**: STDIO requires manual wrapping, SSE tools come pre-formatted from AI SDK
- **Error Handling**: STDIO has custom error objects, SSE uses AI SDK error patterns

### **5. Database (PostgreSQL + Prisma)**
- **Data Persistence**: Stores chat history, user settings, agent configurations (future)
- **ORM**: Prisma for type-safe queries and migrations

### **6. Cache (Redis)**
- **Purpose**: Stores MCP server health status, reducing polling load
- **Access**: Used by `MCPManager`

## Communication & Data Flow Patterns

### **User Interaction → LLM Response**
1. UI sends user message to `/api/chat`.
2. API route calls `streamText` with message history and tools from `MCPManager`.
3. LLM processes, may decide to call a tool.
4. If tool call:
   - **SSE Tools**: AI SDK handles invocation automatically via `loadMCPToolsFromURL` integration
   - **STDIO Tools**: AI SDK calls the `execute` function → `MCPManager` routes to `MCPService` → `MCPService.invokeTool`
   - Result is returned to LLM.
5. LLM generates final response / next step.
6. Response streamed back to UI.

### **MCP Server Health Checking**
1. `MCPManager` periodically polls each `MCPService`.
2. `MCPService` attempts to connect/ping its server.
3. Status (online/offline, tools available) updated in Redis cache.
4. UI can query an API endpoint to display MCP server statuses.

### **Config Format Compatibility**
- **Legacy Format**: `{ "url": "http://...", "disabled": false }`
- **New Format**: `{ "transport": { "type": "sse", "url": "..." } }`
- **Runtime Conversion**: Legacy format automatically converted to transport object

## Error Handling & Resilience Patterns

- **Tool Execution**: 
  - **STDIO**: `MCPService` catches errors, returns structured error object to LLM
  - **SSE**: AI SDK handles errors automatically through its tool invocation system
- **MCP Connection**: Retry mechanisms, status caching
- **Config Compatibility**: Graceful handling of both legacy and new config formats
- **API Errors**: Standard HTTP error responses
- **UI Feedback**: Displays errors and loading states

## Development Workflow Patterns

- **Hot Module Replacement (HMR)**: Next.js feature for fast refresh
- **State Persistence for HMR**: `MCPManager` and `MCPService` instances stored on `globalThis` to survive HMR without re-initializing all connections
- **Dockerized Dev Environment**: Consistent setup using `docker-compose`

## Performance Optimization Patterns

### **Tool Response Processing**
- **Large Response Chunking**: Automatically processes responses >5KB
- **Tool-Specific Processing**: HTML, JSON, and text optimized differently
- **Importance Ranking**: High/Medium/Low priority content sections
- **Smart Truncation**: Preserves key information while reducing token usage

### **Tool Integration Efficiency**
- **SSE Servers**: Leverages AI SDK optimizations and HTTP connection pooling
- **STDIO Servers**: Direct process communication with connection reuse
- **Status Caching**: Redis-based health monitoring reduces polling overhead
- **Lazy Loading**: Tools loaded on-demand as servers become available
