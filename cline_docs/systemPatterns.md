# System Patterns: Zola AI Chat with MCP

## Core Architecture
Zola follows a typical Next.js web application structure. Key components include:
-   **Frontend:** React components for the chat interface (`app/components/chat/`).
-   **API Routes:** Next.js API routes (`app/api/`) for handling chat messages (`app/api/chat/route.ts`) and MCP server management (`app/api/mcp-servers/route.ts`).
-   **AI SDK Integration:** The Vercel AI SDK is used in `app/api/chat/route.ts` to stream responses from an AI model (e.g., via OpenRouter) and handle tool calls.
-   **MCP Management (`lib/mcp/`):**
    *   `MCPService` (`client.ts`): Manages the lifecycle and interaction with a single MCP client (process or remote endpoint). Handles initialization, fetching tools, and invoking tools.
    *   `mcpManager.ts`: Orchestrates all `MCPService` instances. Discovers MCP servers from `config.json`, initializes them, provides their tool definitions to the AI SDK, and manages status polling/caching.
    *   `load-mcp-from-url.ts`: Utility for fetching tool definitions from an MCP server's URL.
-   **Configuration:** `config.json` (for MCP servers) and environment variables (`.env`).
-   **State Management (for MCP Servers):** Redis is used to cache the status and tool lists of MCP servers, polled periodically by `mcpManager`.

## Tool Invocation Flow

1.  **AI Model Request:** The AI model, via the Vercel AI SDK, decides to use a tool and generates a tool call request (e.g., `toolName`, `args`).
2.  **SDK Calls `execute`:** The Vercel AI SDK looks up the tool definition provided by `mcpManager`. This definition now includes an `async execute(args)` method. The SDK calls this `execute` method.
3.  **`mcpManager` Delegates to `MCPService`:** The `execute` method (within the tool definition closure in `mcpManager.ts`) identifies the correct `MCPService` instance associated with the tool's originating server.
4.  **`MCPService.invokeTool`:** The `execute` method calls `mcpServiceInstance.invokeTool(originalToolName, args)`.
5.  **`MCPService` Calls `mcpClient.invoke` (Assumption):** `MCPService.invokeTool` attempts to call `this.mcpClient.invoke(toolName, args)`. `this.mcpClient` is the client object returned by `experimental_createMCPClient`.
    *   **Verification Needed:** A critical assumption is that `this.mcpClient` has an `invoke` method. Runtime logs are expected to confirm this.
6.  **MCP Server Execution:** The MCP client communicates with the actual MCP server, which executes the tool.
7.  **Result Propagation:** The result is returned from the MCP server -> `mcpClient` -> `MCPService.invokeTool` -> `mcpManager`'s `execute` method -> Vercel AI SDK.
8.  **AI Model Receives Result:** The AI SDK provides the tool result back to the AI model.
9.  **AI Model Generates Response:** The model uses the tool's result to formulate its final response to the user.

## Key Technical Decisions

-   **Using Vercel AI SDK for Tool Calling:** Leverages the SDK's built-in capabilities for managing tool interactions with the LLM.
-   **`experimental_createMCPClient`:** Using this function from `@model-context/node` to interface with MCP servers. Its exact capabilities, especially regarding a direct `invoke` method, are under investigation.
-   **`execute` Method on Tool Definitions:** Providing an `execute` method directly on the tool definitions passed to the AI SDK is the current strategy for bridging the SDK's tool calling mechanism with Zola's `MCPService` infrastructure. This replaces previous attempts with `experimental_repairToolCall`.
-   **Centralized MCP Management (`mcpManager`):** Simplifies interaction with multiple MCP servers by providing a single point of control and status aggregation.
-   **Redis for MCP Status Caching:** Improves dashboard responsiveness by serving status information from a cache, updated by background polling.
-   **Stdio and SSE Transports:** The system is designed to support MCP servers communicating via standard I/O (for local tools) and Server-Sent Events (for HTTP-based tools).

## Error Handling and Stability
-   Error handling for tool invocation is being built into the `MCPService.invokeTool` method.
-   Logging is being added to trace the tool call flow and diagnose issues.
-   The stability of MCP subprocesses (stdio) has been a concern, with `BrokenPipeError` and `EPIPE` errors observed previously. Robust handling of client lifecycle and communication is important.