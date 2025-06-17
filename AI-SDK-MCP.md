# AI SDK and MCP Client Management

This document summarizes findings from RAG queries regarding how the AI SDK handles MCP (Model Context Protocol) clients, configurations, and different transport types.

## RAG Query Results

Based on RAG queries against AI SDK documentation and related resources, here's a summary of how the AI SDK handles MCP clients:

**General MCP Support:**
*   The AI SDK has **experimental support** for connecting to Model Context Protocol (MCP) servers. This allows AI applications to discover and use tools from various services through a standardized interface.
*   The primary function of the AI SDK's MCP client is **tool conversion** between MCP tool definitions and the AI SDK's tool format.
*   The feature is explicitly marked as experimental and subject to change or removal.

**Client Creation & Configuration:**
*   MCP clients are created using `experimental_createMCPClient` from the `"ai"` package.
*   The `experimental_createMCPClient` function takes a configuration object.
*   This configuration includes a `transport` property, which defines how the client communicates with the MCP server.
*   Currently, custom configuration of the client itself (beyond transport) and accepting notifications from MCP servers are **not supported** by the AI SDK's MCP client.

**Supported Transports:**

1.  **Stdio (`Experimental_StdioMCPTransport` from `"ai/mcp-stdio"`):**
    *   Uses standard input/output streams for communication.
    *   Ideal for local tool servers running on the same machine (e.g., CLI tools, local services).
    *   **Node.js environments only.**
    *   Configuration involves specifying the `command` and `args` to launch the stdio-based MCP server.
    *   Example from AI SDK docs:
        ```typescript
        import { experimental_createMCPClient } from 'ai';
        import { Experimental_StdioMCPTransport } from 'ai/mcp-stdio';

        const transport = new Experimental_StdioMCPTransport({
          command: 'node',
          args: ['src/stdio/dist/server.js'], // Path to the server script
        });
        const mcpClient = await experimental_createMCPClient({ transport });
        ```

2.  **SSE (Server-Sent Events):**
    *   Uses HTTP-based real-time communication.
    *   Better suited for remote MCP servers that need to send data over a network.
    *   The AI SDK documentation mentions `McpSSEServerConfig` as part of the `TransportConfig` union type for `experimental_createMCPClient`.
    *   An example from `ai-sdk.dev/cookbook/node/mcp-tools` suggests a structure like:
        ```typescript
        // const mcpClient = await experimental_createMCPClient({
        //   transport: { // This implies an McpSSEServerConfig structure
        //     type: 'sse', // This 'type' field is hypothetical for AI SDK's direct config
        //     url: 'http://localhost:3001/mcp',
        //     // headers: { ... } // If supported
        //   },
        // });
        ```
        *Note: The exact structure and capabilities of the AI SDK's built-in SSE transport configuration for `experimental_createMCPClient` need to be verified from its type definitions, as RAG results were general. It might expect an instantiated transport object similar to Stdio or Custom, or a plain config object.*

3.  **Custom Transport:**
    *   Users can provide their own transport implementation as long as it conforms to the `MCPTransport` interface (likely defined within the AI SDK or the core MCP libraries it uses).
    *   The documentation shows an example of using `StreamableHTTPClientTransport` from MCP's official TypeScript SDK (`@mcp/client`) as a custom transport. This is a common way to handle HTTP-based MCP servers that might stream responses (not necessarily just SSE).
    *   Example from AI SDK docs:
        ```typescript
        import { experimental_createMCPClient } from 'ai';
        import { StreamableHTTPClientTransport } from '@mcp/client'; // From official MCP SDK

        const customTransport = new StreamableHTTPClientTransport({
          url: 'http://localhost:3002/mcp', // URL of the MCP server
          // headers: { 'Authorization': 'Bearer ...' } // Example header
        });
        const mcpClient = await experimental_createMCPClient({
          transport: customTransport,
        });
        ```

**Key Takeaways & Implications for Piper:**
*   Piper's MCP integration, specifically in `lib/mcp/enhanced/client-factory.ts` or `mcpManager.ts`, will need to use `experimental_createMCPClient`.
*   The choice of transport instantiation will depend on the `type` field in Piper's `ServerConfigEntry` (`'stdio'`, `'sse'`, `'streamableHttp'`):
    *   For `'stdio'`, Piper's config (`command`, `args`) maps directly to `Experimental_StdioMCPTransport` options.
    *   For `'sse'`, Piper's config (`url`, `Headers`) would be used to configure an SSE-compatible transport. If the AI SDK's `experimental_createMCPClient` doesn't take a plain SSE config object directly for its `transport` field, Piper might need to instantiate an SSE transport client (perhaps from `@mcp/client` or a similar library if the AI SDK doesn't expose its own SSE transport class directly for instantiation) and pass that instance.
    *   For `'streamableHttp'`, Piper's config (`url`, `Headers`) maps well to `StreamableHTTPClientTransport` from `@mcp/client`.
*   The `client-factory.ts` in Piper should dynamically create the correct transport instance based on the `ServerConfigEntry.type` and then pass it to `experimental_createMCPClient`.
*   Given the experimental nature of AI SDK's MCP support, robust error handling around client creation and tool usage is crucial.
*   The current lack of support for server-initiated notifications in the AI SDK's MCP client is a point to note, though most MCP interactions are request-response.
