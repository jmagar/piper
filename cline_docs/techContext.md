# Technical Context: Zola Development Environment

## Technologies Used

-   **Core Stack:** Node.js, TypeScript, Next.js
-   **AI Integration:**
    *   Vercel AI SDK (version checked via `package.json` as `ai@3.0.0-experimental.19` during previous debugging, current specific version might vary but is generally `3.x`)
    *   OpenRouter (as one of the LLM providers)
-   **Database & Caching:**
    *   Prisma (ORM for database interactions, e.g., chat history)
    *   PostgreSQL (Primary database)
    *   Redis (`ioredis` client) for caching MCP server statuses.
-   **MCP (Model Context Protocol):
    *   `@model-context/node` library, specifically `experimental_createMCPClient` for creating client instances.
    *   Various MCP server implementations (Python, Node.js) that communicate via stdio (for local CLI tools) or SSE (for HTTP services).
-   **Development Tools:**
    *   ESLint, Prettier (Linting and formatting)
    *   `uv` (Python package manager/virtual environment, if Python MCP servers are used locally)
    *   `npx` (for running Node.js packages)
    *   Docker, Docker Compose (for managing services like PostgreSQL, Redis, and potentially containerized MCP servers).

## Development Setup

-   **Local Development Server:** `npm run dev` starts the Next.js application.
-   **MCP Servers:**
    *   Defined in `config.json` in the project root.
    *   Managed by `mcpManager.ts`, which can spawn local MCP servers as child processes (stdio) or connect to remote MCP servers (SSE via URL).
-   **Dependent Services:** PostgreSQL and Redis are typically run using Docker Compose (`docker-compose up -d zola-db zola-redis`).
-   **Environment Variables:** Stored in `.env`. Key variables include `OPENROUTER_API_KEY`, `DATABASE_URL`, `REDIS_URL`.
-   **Hot Module Replacement (HMR):** Standard Next.js feature. Care has been taken in `mcpManager.ts` to prevent re-initialization of MCP clients and polling intervals during HMR by storing shared state on `globalThis`.

## Technical Constraints & Considerations

-   **Vercel AI SDK Tool Schema Compatibility:** MCP tool schemas need to be adapted (e.g., wrapped with `jsonSchema`) to be compatible with the Vercel AI SDK's expectations.
-   **`experimental_createMCPClient` Behavior:** The exact methods and properties of the client object returned by `experimental_createMCPClient` are not fully documented. A key current assumption is the existence of an `invoke(toolName, args)` method on this client. This is being verified through runtime logging.
    *   If `invoke` is not present, direct communication (HTTP requests for SSE, or stdio stream interaction for local processes) will need to be implemented within `MCPService.invokeTool`.
-   **`as any` Casts:** Due to the uncertainty around `mcpClient.invoke`, `as any` casts are temporarily used in `MCPService.invokeTool`. These should be resolved once the client's interface is confirmed.
-   **Managing Lifecycle of Diverse MCP Servers:** Ensuring robust startup, communication, and shutdown for MCP servers, especially those run as child processes.
-   **Error Handling:** Comprehensive error handling is crucial for asynchronous operations, LLM interactions, external service calls (MCP tools), and subprocess management.
-   **Debugging AI SDK Tool Calling:** The interaction between the Vercel AI SDK's tool-calling mechanism and Zola's custom MCP invocation logic (`tool.execute` -> `MCPService.invokeTool`) is a complex area currently under active debugging.