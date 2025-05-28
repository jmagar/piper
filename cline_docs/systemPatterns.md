# System Patterns

## Overall Architecture

-   **Next.js App Router**: The application uses the Next.js App Router for routing and server-side rendering capabilities.
-   **React Components**: UI is built with React components, leveraging client and server components as appropriate.
-   **Webpack (Currently)**: Used for development builds (`next dev`). Turbopack was trialed but currently causes generic runtime errors.
-   **Admin-Only Focus**: The system has been refactored to be an admin-only application. All multi-user features, complex internal authentication, and cloud dependencies (like Supabase) have been removed. Components operate under the assumption that they are running in an authenticated admin context.
-   **Externalized Authentication**: User authentication is intended to be handled externally by Authelia, providing 2FA. The application itself does not manage user sessions or credentials.
-   **Dockerized Deployment**: The application and its database are designed to run in Docker containers, managed by `docker-compose.yml`.

## Data Management

-   **PostgreSQL Database**: The primary data store is a PostgreSQL 16 database, running in a Docker container.
-   **Prisma ORM**: Prisma is used as the Object-Relational Mapper to interact with the PostgreSQL database, providing a type-safe data access layer.
-   **`"server-only"` Directive**: Modules containing server-side logic (especially those interacting with Prisma or other backend resources) that are not React Server Components are marked with `"server-only";` to prevent them from being bundled into client-side JavaScript.
-   **API Routes for Client Data Fetching**: Client components requiring data from the server fetch this data through dedicated Next.js API Routes (Route Handlers). This pattern ensures a clear separation between client-side presentation logic and server-side data access.
    - Example: `MessagesProvider` fetching from `/api/messages/[chatId]`.
-   **Chat Creation Pattern**: The `useChatUtils` hook handles new chat creation. It first calls an API route (`/api/chat`) to create or retrieve a chat session ID using `prisma.chat.upsert`. This ensures a `Chat` record exists before any messages are associated with it, preventing foreign key constraint violations. The `chatId` is then used for subsequent message operations.
-   **Environment Variables**: Primary method for configuration.

### MCP Client Transport Handling

-   **Transport Type Inference:** The `mcp-client.ts` script infers the transport type for an MCP server based on its configuration in `config.json`:
    -   If a `command` property is present, `stdio` transport is inferred.
    -   If a `url` property is present (and no `command`), `sse` (Server-Sent Events) transport is inferred. This applies even if an old `transportType: "http"` is in the config, as SSE is the current standard for URL-based MCPs.
-   **Stdio Transport Implementation:** For `stdio` transports, the client utilizes the `Experimental_StdioMCPTransport` class provided by the `ai/mcp-stdio` submodule of the `ai` SDK (version `4.3.16`). This class handles the underlying process communication.
-   **SSE Transport Implementation:** For `sse` transports, the client constructs a plain JavaScript object `{ type: 'sse', url: '...', headers: ... }` as expected by the `experimental_createMCPClient` function from the `ai` SDK.