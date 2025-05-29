MCP TODO:

Break client.ts down by transport type
    - stdio-client.ts, sse-client.ts, streamable-client.ts
        - fetch https://modelcontextprotocol.io/specification/2025-03-26/basic/transports#streamable-http
    
Error handling/logging:
    - fetch https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling#handling-errors
    - fetch https://modelcontextprotocol.io/specification/2025-03-26/basic
    - fetch https://modelcontextprotocol.io/specification/2025-03-26/basic/lifecycle#error-handling
    - fetch https://modelcontextprotocol.io/specification/2025-03-26/basic/transports#streamable-http
    - fetch https://modelcontextprotocol.io/docs/concepts/tools#error-handling-2
    - fetch https://ai-sdk.dev/docs/ai-sdk-core/error-handling

Cancellation:
    - fetch https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
    - fetch https://modelcontextprotocol.io/specification/2025-03-26/basic/utilities/cancellation

Progress:
    - fetch https://modelcontextprotocol.io/specification/2025-03-26/basic/utilities/progress

Roots:
    - fetch https://modelcontextprotocol.io/specification/2025-03-26/client/roots

Sampling:
    - fetch https://modelcontextprotocol.io/specification/2025-03-26/client/sampling

Multi-modal tool results:
    - fetch https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling#multi-modal-tool-results

Track tool usage by server
Server errors on dashboard