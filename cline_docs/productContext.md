# Product Context: Zola - AI Chat with MCP Tool Integration

## Why this project exists
Zola is an application designed to provide an AI-powered chat interface. A core feature is its ability to integrate with and utilize a suite of external tools and services managed by the Model Context Protocol (MCP). This allows the AI to perform actions, retrieve information, and interact with various systems.

## What problems it solves
- Enables complex interactions and workflows by giving the AI access to real-world tools and data.
- Provides a centralized chat interface for leveraging multiple backend services through MCP.
- Aims to offer a robust and extensible platform for AI-driven tasks.

## How it should work
- A user interacts with Zola through a chat interface.
- When the AI determines a need to use an external tool to fulfill a user's request, it signals this intent (typically as a tool call).
- The Zola backend, using the Vercel AI SDK, processes this tool call.
- **Tool Definition and Execution:**
    - `mcpManager.ts` discovers available MCP tools and prepares their definitions for the AI SDK. Each tool definition provided to the SDK now includes an `execute` method.
    - When the AI SDK decides to use a tool, it calls this `execute` method associated with the specific tool.
    - The `execute` method (within `mcpManager.ts`) then retrieves the appropriate `MCPService` instance for that tool's server.
    - It calls the `invokeTool(toolName, args)` method on the `MCPService` instance.
    - The `MCPService.invokeTool()` method (in `lib/mcp/client.ts`) is responsible for calling the underlying MCP client (obtained from `experimental_createMCPClient`). It attempts to call an `invoke(toolName, args)` method on this client.
- The result of the tool execution is returned up the chain to the AI SDK, which then provides it to the AI model.
- The AI model uses this information to formulate a response to the user.
- Error handling should be robust at all stages: AI interaction, tool schema processing, tool invocation (including the assumption of `mcpClient.invoke`), and result processing.