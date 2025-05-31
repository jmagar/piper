# System Patterns: Piper Application

## Core Architecture: Next.js + Docker + Prisma

- **Application Framework**: Next.js is used for both the frontend (React components, App Router) and the backend (API Routes).
- **Containerization**: Docker and Docker Compose are central to the development and deployment strategy. `docker-compose.dev.yml` (orchestrated by `dev.sh`) defines the development environment, including the application (`piper-app`), database (`piper-db`), and cache (`piper-cache`).
- **Database Interaction**: Prisma serves as the ORM for interacting with the PostgreSQL database. Schema is defined in `prisma/schema.prisma` and synchronized using `npx prisma db push`.

## Key System Patterns & Technical Decisions:

### 1. Development Environment Setup (`docker-compose.dev.yml`)
    - **Service Orchestration**: `dev.sh` script manages `docker-compose.dev.yml` for starting/stopping services.
    - **`piper-app` Service Startup**: The command `sh -c "npx prisma db push && npm run dev"` is critical. It ensures the database schema is up-to-date and the Prisma client is generated *before* the Next.js development server starts. This resolved earlier issues with missing tables or outdated client.
    - **Hot Reloading**: Achieved by mounting the local source code (`.:/app`) into the `piper-app` container. The `/app/node_modules` volume is used to keep container dependencies isolated.
    - **Environment Variables**: Loaded from `.env` at the project root and can be overridden in `docker-compose.dev.yml`. `NODE_ENV=development` is set for the dev server.

### 2. Server-Side Fetch Utility (`lib/server-fetch.ts`)
    - **Absolute URL Handling**: Provides `serverFetch` and `serverFetchJson` functions for server-side API calls with absolute URLs.
    - **Environment Integration**: Uses `NEXT_PUBLIC_APP_URL` environment variable to construct proper URLs for internal API calls.
    - **Server Component Safety**: Ensures Server Actions and API routes can safely make internal API calls without URL parsing errors.

### 3. MCP Server Management UI Pattern (Enhanced Dashboard)
    - **Unified Interface Architecture**: The MCP Servers Dashboard Dialog (`app/components/mcp-servers/mcp-servers-dashboard.tsx`) combines status monitoring and configuration management in a single interface.
    - **Dual API Integration Pattern**: 
        - Uses `/api/mcp-servers` for real-time server status and health information
        - Uses `/api/mcp-config` for CRUD operations on server configurations
        - Merges data from both APIs to provide unified server objects with both status and configuration data
    - **State Management Pattern**:
        - Maintains separate state for status data (`servers`) and configuration data (`configServers`)
        - Uses dirty state tracking (`isDirty`) to enable/disable save operations
        - Implements optimistic updates for immediate UI feedback
    - **Modal-Based CRUD Pattern**:
        - Add/Edit operations use modal dialogs with comprehensive form handling
        - Transport-specific form fields (stdio vs sse/http) with conditional rendering
        - Form validation with immediate feedback and error prevention
        - Confirmation dialogs for destructive operations (delete)
    - **Enhanced Server Cards**:
        - Preserves original hover functionality for tool listings
        - Adds action controls (toggle switches, edit/delete buttons) without disrupting status display
        - Responsive grid layout that adapts to screen sizes
    - **Error Handling & User Feedback**:
        - Toast notifications for all operations (success/error)
        - Comprehensive client-side validation with specific error messages
        - Graceful error boundaries and fallback states

### 4. CSRF Protection (Removed)
    - **Removal Rationale**: Custom CSRF implementation was removed as it's not needed with 2FA via Authelia.
    - **Security Pattern**: Relies on Authelia 2FA for state-changing operation protection.

### 5. API Route Handling (Next.js)
    - **Backend Logic**: API routes under `app/api/` (e.g., `app/api/create-chat/route.ts`) handle specific backend operations.
    - **Database Operations**: These routes use the Prisma client (`lib/prisma.ts`) to interact with the database (e.g., creating a new chat entry).
    - **Request Handling**: Standard Next.js `Request` and `NextResponse` objects are used.

### 6. Database Schema Management (Prisma)
    - **Schema Definition**: `prisma/schema.prisma` is the source of truth for database table structures.
    - **Synchronization**: `npx prisma db push` is used in the development startup command to apply schema changes to the database and generate the Prisma client. This is preferred over migrations for rapid development iterations where destructive changes are acceptable.

### 7. Client-Side Data Fetching & State
    - **API Calls**: Frontend components use standard `fetch` for API calls to backend routes.
    - **Error Handling**: UI components (e.g., `ChatWindow`) handle responses from API calls, including displaying error messages like "Failed to create chat" based on the success or failure of these calls.
    - **Local Caching (IndexedDB)**: `lib/chat-store/persist.ts` suggests the use of `idb-keyval` for client-side caching of chat data, reducing direct database queries for read operations.

### 8. Configuration Management (`.env`)
    - **Centralized Secrets/Config**: The `.env` file at the project root is the primary source for environment-specific variables like database connection strings (though `DATABASE_URL` is typically overridden in Docker Compose to use service names), API keys, and application URLs.
    - **MCP Server Configuration**: MCP servers are configured via `config.json` file with support for both STDIO and SSE/HTTP transport types.

### 9. Docker Image Build (`Dockerfile.dev`)
    - **Development Focus**: `Dockerfile.dev` is tailored for the development environment, likely prioritizing build speed and enabling hot reloading features.
    - **Base Image**: Uses a Node.js base image (e.g., `node:20-alpine`).
    - **Dependency Installation**: `npm install` (or `npm ci`) is used to install project dependencies.
    - **Working Directory**: Sets `/app` as the working directory.
    - **User**: Runs as root (`user: "0:0"`) in `docker-compose.dev.yml` to mitigate volume permission issues on the host.

### 10. Component Enhancement Pattern (Bivvy Climb System)
    - **Structured Enhancement Process**: Uses the Bivvy climb system for major feature development with comprehensive PRDs and task breakdowns.
    - **Move-by-Move Implementation**: Large features are broken into manageable "moves" that can be completed incrementally.
    - **PRD-Driven Development**: Detailed Product Requirements Documents guide implementation and ensure all requirements are met.
    - **Continuous Integration**: Each move builds upon previous work while maintaining existing functionality.