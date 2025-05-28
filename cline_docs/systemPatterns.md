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
-   **Chat Creation Pattern**: The `/api/chat` route now employs a `prisma.chat.upsert` strategy. This ensures that when a message is posted, if the associated `Chat` record doesn't exist, it's created on-the-fly with a default title and other details from the request, preventing foreign key violations for messages.
-   **Local File Storage**: File uploads are planned to be handled by storing files directly on the local filesystem of the server, mapped via Docker volumes.
-   **Prisma Migrations**: Database schema changes are managed via Prisma migrations, which are automatically applied when the application container starts using the command `npx prisma migrate deploy`.

## Configuration

-   **Environment Variables**: Application configuration (API keys, database URLs, directory paths) is managed through environment variables.
    -   A `.env` file is used to source these variables.
    -   `docker-compose.yml` uses `env_file: .env` and can also provide service-specific overrides (e.g., `DATABASE_URL` for the app service).
-   **Tool Definitions**: Specific tool configurations (like for Exa) are maintained in dedicated `.definition.ts` files.

## Key Technical Decisions

-   **Supabase Removal**: Migrated away from Supabase to simplify the stack and align with the admin-only, self-hosted model.
-   **Internal Authentication Removal**: Systematically removed internal checks for `isAuthenticated`, `user` objects, and related logic from UI components and hooks. The application now assumes an admin context.
-   **Prisma for Data Access**: Adopted Prisma for type-safe and efficient database interactions with PostgreSQL.
-   **Server-Side Logic Protection**: Strict adherence to using `"server-only"` for backend modules and API routes for client-server communication.
-   **Docker for Deployment**: Standardizing on Docker and Docker Compose for development and production environments.
-   **Webpack as Default Bundler (Currently)**: Due to unresolved runtime errors with Turbopack.
-   **Focus on Simplicity and Control**: Emphasizing a minimal, controllable, and self-hosted setup.
-   **Client-Side State Management**: React Context API is used for managing client-side state. `localStorage` is used for persisting some client-side data like chat drafts.

## Architecture Patterns

### File Structure (Simplified)
```
app/
├── api/           # API routes (e.g., chat, messages) - Server-side logic
│   ├── chat/
│   │   ├── route.ts  # Handles new messages, includes Chat upsert logic
│   │   └── api.ts    # Helper functions for DB interaction (logUserMessage, etc.)
│   └── messages/
│       └── [chatId]/
│           └── route.ts # Fetches messages for a chat
├── components/    # React components (refactored for admin-only context)
│   ├── layout/header.tsx
│   ├── chat/chat.tsx
│   ├── chat/use-chat-utils.ts
│   └── ...
├── providers/     # Context providers (e.g., user-preferences-provider simplified)
└── (other Next.js app router directories)

lib/
├── agents/        # Agent-related logic
├── chat-store/    # Client-side chat state management
├── prisma.ts      # Prisma client instantiation ("server-only")
└── (other utility directories)

prisma/
├── schema.prisma  # Database schema
├── migrations/    # Prisma migration files
└── seed.ts        # Database seeding (if used)

.env               # Environment variables
Dockerfile         # Defines the application image
docker-compose.yml # Orchestrates Docker services (app, database)
```

### Data Flow (Example: Posting a New Message to a New Chat)
1.  Client (operating in an assumed admin context) sends a message to `/api/chat` (POST request) with `chatId` (can be a new UUID from client), message content, model info, etc.
2.  The `/api/chat/route.ts` handler receives the request.
3.  It performs `prisma.chat.upsert({ where: { id: chatId }, create: { id: chatId, title: '...', ... } })`.
    - If `Chat` with `chatId` exists, it's updated (e.g., `updatedAt`).
    - If not, a new `Chat` record is created using the provided `chatId`, a generated title, and other details from the request.
4.  The handler then calls `logUserMessage()` (from `app/api/chat/api.ts`) which uses `prisma.message.create()` to save the user's message, linking it to the now-guaranteed-to-exist `chatId`.
5.  AI processing occurs, and `storeAssistantMessage()` saves the assistant's response, also linking to `chatId`.
6.  A streaming response is sent back to the client.