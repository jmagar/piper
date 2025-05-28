# Tech Context

## Core Framework & Language

-   **Next.js**: `15.4.0-canary.48` (App Router)
-   **React**: `^19` (Verify from `package.json` if more specific, but `^19` aligns with Next 15)
-   **TypeScript**: `^5`
-   **Node.js**: `^20` (as per `package.json` typical Next.js setup)

## Database

-   **PostgreSQL**: `16` (via `postgres:16` Docker image)
-   **Prisma**: `6.8.2` (ORM for PostgreSQL)

## Development & Build Tools

-   **Webpack**: Currently used with `next dev` for development builds.
-   **Turbopack**: Available via `next dev --turbopack`, but currently causes generic runtime errors.
-   **npm**: Used for managing project dependencies and running scripts (e.g., `npm run dev`, `npm start`).
-   **ESLint/Prettier**: Assumed for code linting and formatting (standard for Next.js projects, verify specific versions from `package.json` if critical).

## UI & Styling

-   **Tailwind CSS**: (Assumed, standard for Zola project - verify from `tailwind.config.js` or `package.json`)
-   **shadcn/ui components**: (Assumed, standard for Zola project)

## Deployment & Orchestration

-   **Docker**: Application and database are containerized.
    -   `Dockerfile` for building the Next.js application image.
    -   `docker-compose.yml` for orchestrating `zola-app` and `zola-db` services.
-   **Authelia**: External service intended for handling authentication (2FA). The application itself operates assuming an admin context.

## Key Libraries & APIs

-   **`ai` SDK / `@ai-sdk/ui-utils`**: For AI chat functionalities, message construction, and UI utilities.
-   **`@openrouter/ai-sdk-provider`**: To integrate with OpenRouter for AI model access.
-   **`server-only` package**: Used by Next.js to mark modules as server-side only.
-   **`dotenv`**: For loading environment variables from `.env` file.
-   Refer to `package.json` for a complete list of libraries.

## Development Setup

-   Clone the repository.
-   Create a `.env` file based on `.env.example` (if one exists) or populate with necessary variables:
    - `ADMIN_USERNAME`, `ADMIN_PASSWORD` (for external auth like Authelia, not used by the app directly for sessions)
    - `DATABASE_URL=postgresql://zola:zola@localhost:5432/zola` (for local non-Docker Prisma commands if needed, the Docker service uses an override)
    - `UPLOADS_DIR=/uploads`
    - `CONFIG_DIR=/config`
    - `OPENAI_API_KEY` (if used directly)
    - `OPENROUTER_API_KEY`
-   Run `docker compose up -d --build` to build images and start services.
    - The `zola-app` service will run `npx prisma migrate deploy` then `npm start`.
-   Access the application at `http://localhost:3021` (as per `docker-compose.yml` port mapping).
-   View logs with `docker compose logs -f`.

## Technical Constraints

- No Cloud Dependencies: Must work completely offline.
- Single User (Admin-Only): No multi-user authentication or authorization *within the app*. The app assumes it is run by an admin.
- Local Storage Only: All data (database, file uploads) stored on local filesystem via Docker volumes.
- PostgreSQL Required: Database must be PostgreSQL.
- Docker Volumes: Persistent storage via Docker volumes (e.g., `./db-data`, `./uploads`).
- Environment Variables: Primary method for configuration.

## Removed Dependencies
- Supabase (cloud database/auth)
- Clerk (authentication service)
- All internal application-level user authentication and session management logic.

-   **`ai` SDK (version `4.3.16`)**: Used for core AI functionalities, including `experimental_createMCPClient` for MCP integration.
    -   Its submodule `ai/mcp-stdio` provides `Experimental_StdioMCPTransport` for command-based MCP servers.