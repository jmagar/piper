# System Patterns: Piper AI Chat Application

**Last Updated**: 2025-05-30T00:39:11-04:00

This document outlines the key architectural patterns, technical decisions, and operational designs implemented in Piper.

## 1. MCP Integration Architecture

Piper's core functionality revolves around its integration with the Model Context Protocol (MCP).

### **Service Discovery & Configuration**
*   MCP services are defined in `config.json`.
*   Each entry specifies the server key (name), transport type (`stdio` or `sse`), connection details (command/args for stdio, URL/headers for sse), and any associated metadata.
*   The `MCPManager` (`lib/mcp/mcpManager.ts`) is responsible for parsing this configuration and initializing each `MCPService` instance.

### **`MCPService` Class (`lib/mcp/client.ts`)**
*   Encapsulates all logic for interacting with a single MCP server.
*   Implements the MCP 2024-11-05 specification, including the handshake sequence (`initialize` -> `response` -> `notifications/initialized`).
*   Handles client creation using `@model-context/node`'s `experimental_createMCPClient`.
*   **Tool Fetching**: Retrieves tool definitions from the MCP server upon successful initialization.
*   **Status Management**: Tracks connection status (`uninitialized`, `connected`, `error`, `no_tools_found`).

### **Tool Invocation Patterns**

A critical distinction exists in how tools from STDIO and SSE MCP servers are handled and invoked:

**A. STDIO (Standard I/O) MCP Servers:**
*   **Initialization**: Started as child processes by `MCPManager` based on `config.json` commands (e.g., `uvx my-mcp-server`, `npx @user/my-mcp-tool`).
*   **Tool Representation**: Tools fetched from STDIO servers are plain JavaScript objects describing parameters and purpose.
*   **Invocation**: The `MCPManager` (specifically in `getCombinedMCPToolsForAISDK`) wraps these tools in an `execute` function. This function manually uses `mcpServiceInstance.invokeTool(toolName, args)` which, for STDIO, directly calls `this.mcpClient.invoke(toolName, args)` on the client returned by `experimental_createMCPClient`.
    ```typescript
    // Simplified pattern for STDIO tool wrapping in getCombinedMCPToolsForAISDK
    combinedTools[`${serverKey}_${toolName}`] = {
      description: toolDefinition.description,
      parameters: toolDefinition.parameters_schema || { type: 'object', properties: {} },
      execute: async (args: any) => {
        // ... (argument parsing, logging)
        const result = await mcpService.invokeTool(toolName, parsedArgs);
        // ... (result processing, logging)
        return result;
      },
    };
    ```

**B. SSE (Server-Sent Events) MCP Servers:**
*   **Initialization**: Connected via HTTP/SSE to a URL specified in `config.json`.
*   **Tool Representation & Invocation (THE FIX)**: Tools from SSE servers are loaded using `loadMCPToolsFromURL` (from `lib/mcp/load-mcp-from-url.ts`, which likely uses `@model-context/node` utilities internally for SSE). This function returns tools that are **already compatible with the Vercel AI SDK and handle their own invocation logic internally.**
*   **The `getCombinedMCPToolsForAISDK` function in `MCPManager` was updated to correctly identify SSE servers (even with legacy config) and use `loadMCPToolsFromURL`.**
    ```typescript
    // Simplified pattern for SSE tool loading in getCombinedMCPToolsForAISDK
    // (after ensuring 'transport' object is correctly formed for SSE)
    if (transport.type === 'sse' && transport.url) {
      const { loadMCPToolsFromURL } = await import('../load-mcp-from-url');
      const { tools: mcpToolsFromSSE } = await loadMCPToolsFromURL(transport.url, transport.headers);
      Object.entries(mcpToolsFromSSE).forEach(([toolName, sdkCompatibleTool]) => {
        combinedTools[`${serverKey}_${toolName}`] = sdkCompatibleTool; // Directly assign SDK-compatible tool
      });
    }
    ```
*   **No Manual Invocation Needed**: Unlike STDIO tools, SSE tools obtained this way do not need an `execute` wrapper or manual calls to `mcpService.invokeTool()`. The Vercel AI SDK's `streamText` (or similar functions) automatically handles their invocation when they are provided in the `tools` option.

### **Key Technical Decision: Fixing SSE Tool Loading**
*   **Problem**: Legacy SSE configurations in `config.json` (with only `url`) were not being processed correctly to form a `transport` object, preventing `loadMCPToolsFromURL` from being called.
*   **Solution**: `getCombinedMCPToolsForAISDK` was modified to detect such configurations and construct the `transport: { type: 'sse', url: '...' }` object on the fly. This enabled `loadMCPToolsFromURL` to function correctly, making all 107 SSE tools available.

## 2. Vercel AI SDK Integration

*   Piper uses the Vercel AI SDK (version 3.x) for managing chat interactions, LLM communication, and tool usage within the AI flow.
*   **Tool Registration**: All discovered and processed MCP tools (both STDIO-wrapped and SSE-loaded) are provided to the AI SDK's `streamText` (or equivalent) function.
*   **Automatic Tool Invocation (for properly prepared tools)**: The SDK handles the decision of when to call a tool and manages the execution flow for tools that are structured according to its expectations (which `loadMCPToolsFromURL` provides for SSE).

## 3. State Management in Development (Next.js HMR)

*   To prevent re-initialization of all MCP services during Next.js hot module replacement (HMR):
    *   The `MCPManager` instance and the collection of `MCPService` instances are stored on `globalThis` in development mode.
    *   This ensures that established MCP connections and toolsets persist across code changes, significantly speeding up the development cycle.

## 4. Performance Optimization Patterns

*   **Chunked Response Processing**: For tool responses exceeding a certain size (e.g., 5KB), content is automatically chunked. Tool-specific processors can further refine this (e.g., extracting key sections from HTML).
*   **Redis Caching**: MCP server statuses are cached in Redis (default TTL 300s) to reduce polling frequency and load on MCP servers. `MCPManager` performs periodic health checks (e.g., every 60 seconds).
*   **Optimized Docker Builds**: Multi-stage Docker builds are used to create smaller production images, improving deployment speed and resource efficiency.

## 5. Security Patterns

*   **Environment Variables**: All sensitive data (API keys, secrets) are managed via `.env` files and accessed as environment variables. No secrets are hardcoded.
*   **Docker Networking**: In production (e.g., Unraid), Docker containers are networked appropriately. Piper application container communicates with MCP servers hosted on the Unraid machine via the host's IP address (e.g., `10.1.0.2`) rather than `localhost`.
*   **MCP Server Isolation**: Each MCP server typically runs as an isolated process or service, limiting its potential impact in case of compromise.

## 6. Production Deployment (Unraid Focus)

*   **Container Orchestration**: `docker-compose.yml` defines the multi-container setup (Piper app, PostgreSQL DB, Redis cache, and potentially MCP servers themselves if containerized).
*   **Persistent Volumes**: Named Docker volumes are used for PostgreSQL data and other persistent state, managed by Unraid.
*   **Host IP for Services**: MCP server URLs in `config.json` for SSE services running on the Unraid host must use the host's actual IP address (e.g., `http://10.1.0.2:PORT`) for the Piper container to reach them.