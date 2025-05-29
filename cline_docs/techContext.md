# Tech Context: Piper Application Stack

## Core Technologies

### **Next.js 15 (App Router)**
- **Framework**: React-based full-stack framework
- **Routing**: App Router for server components and API routes
- **Deployment**: Dockerized for production on Unraid

### **TypeScript**
- **Language**: Superset of JavaScript for type safety
- **Compilation**: Strict mode enabled, part of Docker build process
- **Benefits**: Improved code quality, early error detection, better maintainability

### **Prisma ORM**
- **Database**: PostgreSQL
- **Interaction**: Type-safe database access, schema migrations
- **Tooling**: Prisma Studio for database inspection

### **Redis**
- **Purpose**: Caching MCP server status, potentially session management
- **Client**: `ioredis`
- **Benefits**: Reduced latency for status checks, improved resilience

### **Vercel AI SDK**

Piper leverages the Vercel AI SDK for core language model interactions, including `streamText` for generating responses and managing tool calls.

#### MCP Integration via `@model-context/node` (`ai` package)
- **Version**: `ai@4.3.16`
- **Client Creation**: Uses `experimental_createMCPClient` for connecting to MCP servers
- **Dual Integration Pattern**: 
  - **SSE Transport**: Uses `loadMCPToolsFromURL` utility for automatic AI SDK tool integration
  - **STDIO Transport**: Manual tool wrapping with `execute` functions for direct invocation
- **Tool Loading**: 130+ tools across 19 MCP servers (107 SSE + 23 STDIO)
- **Config Compatibility**: Supports both legacy (`url` field) and new (`transport` object) formats

### **Docker & Docker Compose**
- **Containerization**: Ensures consistent environments
- **Orchestration**: Manages multi-container application (app, db, cache)
- **Build Process**: Optimized Dockerfile with multi-stage builds

## Key Libraries & Frameworks

### **Frontend (React & UI)**
- **`@ai-sdk/react`**: `useChat` hook for chat interface
- **`shadcn/ui`**: UI components (Radix UI + Tailwind CSS)
- **`cmdk`**: Command menu for tool selection
- **`@phosphor-icons/react`**: Icon library
- **`tailwindcss`**: Utility-first CSS framework

### **Backend & API**
- **`@ai-sdk/*` providers**: OpenAI, Anthropic, Google, Mistral, XAI, OpenRouter
- **`@model-context/node`**: For MCP client implementation
- **`zod`**: Schema validation for tool parameters and API requests

### **Development & Tooling**
- **`eslint`, `prettier`**: Code linting and formatting
- **`prisma` CLI**: Database migrations and client generation
- **`ts-node`**: Running TypeScript scripts (e.g., seeding)
- **`uv` / `uvx`**: Python environment and package management for Python MCP servers

## Architectural Decisions

### **MCP Manager (`lib/mcp/mcpManager.ts`)**
- **Centralized Control**: Manages all MCP service instances
- **Dual Integration Strategy**: 
  - **SSE Tools**: Uses `loadMCPToolsFromURL` for automatic AI SDK integration
  - **STDIO Tools**: Manual wrapping with `execute` functions
- **Health Monitoring**: Periodically checks server status and caches it in Redis
- **Transport Object Creation**: Handles legacy config format by creating transport objects at runtime
- **Backward Compatibility**: Seamless support for both old and new configuration formats

### **MCP Service (`lib/mcp/client.ts`)**
- **Protocol Implementation**: Handles MCP handshake and communication
- **Transport Support**: Supports stdio and SSE transports with different invocation patterns
- **Error Handling**: Robust error management for tool execution (primarily STDIO)
- **State Management**: Persists client state across HMR in development

### **SSE Tool Integration Pattern**
```typescript
// Transport object creation for legacy configs
let transport = serverConfig.transport;
if (!transport && serverConfig.url) {
  transport = {
    type: 'sse',
    url: serverConfig.url,
    headers: serverConfig.headers
  };
}

// AI SDK tool loading
const { loadMCPToolsFromURL } = await import('./load-mcp-from-url');
const { tools: mcpTools } = await loadMCPToolsFromURL(transport.url);

// Direct tool registration (AI SDK handles invocation)
Object.entries(mcpTools).forEach(([toolName, toolDefinition]) => {
  combinedTools[`${serverKey}_${toolName}`] = toolDefinition;
});
```

### **State Management (Development)**
- **`globalThis`**: Used to persist MCP Manager and services during Next.js hot reloading
- **Rationale**: Avoids re-initializing all MCP connections on every code change

## Performance Considerations

- **Chunked Responses**: Processing large tool outputs efficiently (>5KB automatic chunking)
- **Caching**: Redis for MCP server status to reduce polling overhead
- **Optimized Docker Builds**: Smaller image sizes, faster deployment (17KB context vs 860MB)
- **Efficient Database Queries**: Leveraging Prisma's capabilities
- **Tool Integration Efficiency**: AI SDK optimizations for SSE, direct process communication for STDIO

## Security Aspects

- **Environment Variables**: `.env` file for managing secrets
- **Docker Networking**: Isolated networks for backend services (Unraid host IP: 10.1.0.2)
- **No Hardcoded Secrets**: API keys and sensitive data managed via env vars
- **MCP Isolation**: Each MCP server runs in isolation with defined capabilities

## Production Deployment Patterns

### **Unraid Host Integration**
- **Network Configuration**: Container-to-host communication via `10.1.0.2`
- **MCP Server URLs**: All SSE servers accessible via host IP (not localhost)
- **Docker Compose**: Multi-container orchestration with persistent volumes

### **Tool Ecosystem Coverage**
- **Media Management**: Plex, Overseerr, Tautulli, SABnzbd, qBittorrent (via SSE)
- **System Administration**: Unraid, Portainer, UniFi controller (via SSE)
- **Development Tools**: GitHub, filesystem operations, code search (via STDIO)
- **Communication**: Gotify notifications and alerting (via SSE)
- **Content Discovery**: Prowlarr indexer management, web crawling (via SSE)
