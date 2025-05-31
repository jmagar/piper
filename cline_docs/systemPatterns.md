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

### 2. CSRF Protection (Custom Implementation)
    - **Token Generation & Validation**: `lib/csrf.ts` contains functions to generate (`generateCsrfToken`) and validate (`validateCsrfToken`) CSRF tokens. This process relies on a `CSRF_SECRET` environment variable.
    - **Cookie Issuance**: The `app/api/csrf/route.ts` API endpoint is responsible for generating a new CSRF token and setting it as an `httpOnly` cookie named `csrf_token`. This endpoint is called by `app/layout-client.tsx` on initial application load.
    - **Middleware Enforcement**: `middleware.ts` intercepts incoming state-changing requests (e.g., POST, PUT, DELETE). It extracts the `csrf_token` from cookies and expects a matching token in the `x-csrf-token` request header.
    - **Client-Side Handling**: `lib/fetch.ts` (`fetchClient` function) reads the `csrf_token` from `document.cookie` and includes it in the `x-csrf-token` header for outgoing API requests.
    - **Error Response**: If validation fails, the middleware returns a 403 Forbidden response with the message "Invalid CSRF token".

### 3. API Route Handling (Next.js)
    - **Backend Logic**: API routes under `app/api/` (e.g., `app/api/create-chat/route.ts`) handle specific backend operations.
    - **Database Operations**: These routes use the Prisma client (`lib/prisma.ts`) to interact with the database (e.g., creating a new chat entry).
    - **Request Handling**: Standard Next.js `Request` and `NextResponse` objects are used.

### 4. Database Schema Management (Prisma)
    - **Schema Definition**: `prisma/schema.prisma` is the source of truth for database table structures.
    - **Synchronization**: `npx prisma db push` is used in the development startup command to apply schema changes to the database and generate the Prisma client. This is preferred over migrations for rapid development iterations where destructive changes are acceptable.

### 5. Client-Side Data Fetching & State
    - **API Calls**: Frontend components use the custom `fetchClient` (from `lib/fetch.ts`) to make requests to backend API routes.
    - **Error Handling**: UI components (e.g., `ChatWindow`) handle responses from API calls, including displaying error messages like "Failed to create chat" based on the success or failure of these calls.
    - **Local Caching (IndexedDB)**: `lib/chat-store/persist.ts` suggests the use of `idb-keyval` for client-side caching of chat data, reducing direct database queries for read operations.

### 6. Configuration Management (`.env`)
    - **Centralized Secrets/Config**: The `.env` file at the project root is the primary source for environment-specific variables like database connection strings (though `DATABASE_URL` is typically overridden in Docker Compose to use service names), API keys, and the critical `CSRF_SECRET`.

### 7. Docker Image Build (`Dockerfile.dev`)
    - **Development Focus**: `Dockerfile.dev` is tailored for the development environment, likely prioritizing build speed and enabling hot reloading features.
    - **Base Image**: Uses a Node.js base image (e.g., `node:20-alpine`).
    - **Dependency Installation**: `npm install` (or `npm ci`) is used to install project dependencies.
    - **Working Directory**: Sets `/app` as the working directory.
    - **User**: Runs as root (`user: "0:0"`) in `docker-compose.dev.yml` to mitigate volume permission issues on the host.