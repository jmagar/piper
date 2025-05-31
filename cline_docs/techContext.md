# Technical Context: Piper Application

## Core Technologies

- **Framework:** Next.js (React framework for server-side rendering and static site generation)
- **Language:** TypeScript
- **Backend:** Next.js API Routes (Node.js runtime environment)
- **Database:** PostgreSQL
- **ORM:** Prisma (for database access and schema management)
- **Caching:** Redis (service `piper-cache`, used by MCP manager and potentially other features)
- **Containerization:** Docker, Docker Compose
- **Package Manager:** npm

## Development Environment (`dev.sh` & `docker-compose.dev.yml`)

- **Orchestration:** The `dev.sh` script is used to manage the development lifecycle (down, up, build).
- **Compose File:** `docker-compose.dev.yml` is the primary configuration for the development environment.
- **Services:**
    - `piper-app`: The Next.js application.
        - Builds from `Dockerfile.dev`.
        - Runs as root (`user: "0:0"`) to avoid permission issues with mounted volumes.
        - Startup Command: `sh -c "npx prisma db push && npm run dev"`. This ensures:
            1. `npx prisma db push`: Synchronizes the Prisma schema with the PostgreSQL database (creates tables, applies changes).
            2. `npm run dev`: Starts the Next.js development server with hot reloading.
        - Ports: Maps port 3000 (container) to 8630 (host).
        - Environment Variables:
            - Loaded from `.env` file at the root of the project.
            - `NODE_ENV=development` (set in `docker-compose.dev.yml`).
            - `DATABASE_URL=postgresql://piper:piper@piper-db:5432/piper` (connects to the `piper-db` service).
            - `REDIS_URL=redis://piper-cache:6379` (connects to the `piper-cache` service).
            - `CSRF_SECRET`: A secret string (must be set in `.env`) used for CSRF token generation and validation.
            - `NEXT_PUBLIC_APP_URL`: The base URL for the application (typically `http://localhost:3000` for development). **CRITICAL** for server-side fetch calls.
        - Volumes:
            - `.:/app`: Mounts the local project directory into the container for hot reloading.
            - `/app/node_modules`: A named volume to keep container `node_modules` separate from host.
            - Persistent data mounts for uploads, config, logs (e.g., `/mnt/cache/appdata/piper/...`).
    - `piper-db`: PostgreSQL database service.
        - Image: `postgres:15-alpine` (or `postgres:16` in `docker-compose.yml`).
        - Environment: Defines `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`.
        - Volumes: `piper_db_data` for persistent database storage.
        - Ports: Maps port 5432 (container) to 8631 (host).
    - `piper-cache`: Redis caching service.
        - Image: `redis:alpine`.
        - Volumes: `piper_cache` for persistent cache data.
        - Ports: Maps port 6379 (container) to 8632 (host).

## Key Libraries, Patterns, and Files

- **Prisma (`lib/prisma.ts`, `prisma/schema.prisma`):**
    - Handles all database interactions.
    - `schema.prisma` defines the database schema.
    - Prisma Client is generated based on the schema.
- **Server-Side Fetch Utility (`lib/server-fetch.ts`)**:
    - Provides utilities for making server-side fetch calls with absolute URLs.
    - `serverFetch` and `serverFetchJson` functions ensure that Server Actions and API routes can safely make internal API calls.
    - Uses `NEXT_PUBLIC_APP_URL` environment variable to construct absolute URLs.
    - **CRITICAL**: Must be used instead of regular `fetch` for any server-side code (marked with `"use server"`) that needs to call API routes.
- **CSRF Protection** (Removed):
    - The custom CSRF implementation has been removed as it's not needed with 2FA via Authelia.
- **Client-Side State/Cache (`lib/chat-store/`):
    - Uses IndexedDB (via `idb-keyval`) for caching chats and messages to improve UX and reduce direct DB calls for reads.
    - `ChatsProvider` (`lib/chat-store/chats/provider.tsx`) manages loading and syncing chat data.
    - Server Actions (functions marked with `"use server"`) in `lib/chat-store/chats/api.ts` use the `serverFetch` utility for API calls.
- **API Routes (`app/api/`):
    - `app/api/create-chat/route.ts`: Handles POST requests to create new chats. Interacts with Prisma to save to DB.
- **Environment Configuration (`.env`):
    - Stores sensitive information and critical configuration like `DATABASE_URL` (though overridden in compose for service name), API keys, admin credentials.
    - **NEXT_PUBLIC_APP_URL**: Must be set to the internal Docker container URL, typically `http://localhost:3000`. This is used by server-side fetch calls.
- **Dockerfiles (`Dockerfile`, `Dockerfile.dev`):
    - Define the build process for the `piper-app` image. `Dockerfile.dev` is optimized for development (e.g., potentially different dependencies or build steps for hot reloading).

## Networking & Communication

- **Internal Docker Network:** Services (`piper-app`, `piper-db`, `piper-cache`) communicate using their service names (e.g., `piper-db:5432`).
- **External Access:** The `piper-app` is accessible on the host machine at `http://localhost:8630`.
- **API Calls:** 
    - **Client-side**: Frontend components make relative API calls (e.g., `/api/create-chat`) which are resolved by the browser to the currently accessed host.
    - **Server-side**: Server components and Server Actions must use `serverFetch` from `lib/server-fetch.ts` to make API calls with absolute URLs.