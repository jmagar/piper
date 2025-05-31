# Technical Context: Piper Application

## Core Technologies

- **Framework:** Next.js (React framework for server-side rendering and static site generation)
- **Language:** TypeScript
- **Backend:** Next.js API Routes (Node.js runtime environment)
- **Database:** PostgreSQL
- **ORM:** Prisma (for database access and schema management)
- **Logging**: Winston (with winston-daily-rotate-file)
- **Caching:** Redis (service `piper-cache`, used by MCP manager and potentially other features)
- **Containerization:** Docker, Docker Compose
- **Package Manager:** npm
- **Key Dependencies (for logging)**: `winston`, `winston-daily-rotate-file`, `uuid`

## Development Environment (`dev.sh` & `docker-compose.dev.yml`)

- **Orchestration:** `dev.sh` script manages the development lifecycle.
- **Compose File:** `docker-compose.dev.yml` for development environment.
- **Services:**
    - `piper-app`: Next.js application.
        - Builds from `Dockerfile.dev`.
        - Startup Command: `sh -c "npx prisma db push && npm run dev"`.
        - Ports: `8630:3000`.
        - Environment: From `.env`, `NODE_ENV=development`, `DATABASE_URL`, `REDIS_URL`, `NEXT_PUBLIC_APP_URL`.
        - Volumes: `.:/app` (hot reloading), `/app/node_modules`, persistent data mounts for `uploads/`, `config/`, `logs/`.
    - `piper-db`: PostgreSQL service (Image: `postgres:15-alpine`).
    - `piper-cache`: Redis service (Image: `redis:alpine`).

## Key Libraries, Patterns, and Files

- **Prisma (`lib/prisma.ts`, `prisma/schema.prisma`):** Database interactions, schema definition.
- **Server-Side Fetch Utility (`lib/server-fetch.ts`)**: For server-side absolute URL API calls using `NEXT_PUBLIC_APP_URL`.
- **Enhanced MCP Server Dashboard (`app/components/mcp-servers/mcp-servers-dashboard.tsx`)**: Unified MCP management interface.
- **Client-Side State/Cache (`lib/chat-store/`):** IndexedDB (via `idb-keyval`) for chat data caching.
- **API Routes (`app/api/`):** Backend operations, Prisma for DB access.
    - `app/api/logs/route.ts`: Serves log data to the log viewer.
    - `app/api/logs/export/route.ts`: Handles log export functionality.
    - `app/api/logs/health/route.ts`: Provides health status of the logging system.
- **Environment Configuration (`.env`):** Secrets, `NEXT_PUBLIC_APP_URL`.
- **Dockerfiles (`Dockerfile`, `Dockerfile.dev`):** Application image build process.

## Logging System Architecture (`lib/logger/`, `middleware/`)

- **Core Logger (`lib/logger/index.ts`)**: 
    - Singleton `appLogger` (Winston instance).
    - Structured JSON logging.
    - Multiple transports (daily rotate for app, error, mcp, ai-sdk, http; console for dev).
    - Source-specific loggers (e.g., `appLogger.mcp.info(...)`).
- **Type Definitions (`lib/logger/types.ts`)**: TypeScript interfaces for `LogEntry`, `ClassifiedError`, `McpLogEntry`, `AiSdkLogEntry`, etc.
- **Correlation (`lib/logger/correlation.ts`, `middleware/correlation.ts`)**: 
    - `AsyncLocalStorage` for context propagation.
    - `correlationManager` singleton.
    - Middleware for `x-correlation-id` handling.
- **Request/Response Logging (`middleware/logging.ts`)**: `nextRequestLoggingMiddleware` for HTTP details.
- **Error Handling (`middleware/error-handler.ts`, `lib/logger/error-handler.ts`):
    - `nextErrorHandler`, `expressErrorHandlingMiddleware`.
    - `AppError` custom error class.
    - `ErrorClassifier` with pattern matching.
    - Global unhandled rejection/exception handlers.
- **Specialized Loggers:**
    - `McpLogger (`lib/logger/mcp-logger.ts`): JSON-RPC messages, server lifecycle, tool performance.
    - `AiSdkLogger (`lib/logger/ai-sdk-logger.ts`): AI operations, streaming, costs, token usage.
- **Security (`lib/logger/security.ts`)**:
    - `logSecurity` singleton.
    - PII detection (regex for email, phone, API keys, etc.) and masking (`[REDACTED]`).
    - Sensitive field name redaction.
- **Rotation (`lib/logger/rotation-config.ts`)**:
    - `logRotationManager` singleton.
    - Winston DailyRotateFile config (`YYYY-MM-DD`, `maxSize`, `maxFiles`).
    - Environment-specific settings.
- **Log Viewer Component (`app/components/log-viewer/index.tsx`)**: React component for log display, filtering, search.
- **Middleware Integration (`middleware.ts`):** Orchestrates all logging-related middleware.

## MCP Server Management Architecture

- **Configuration Storage**: `config.json` (STDIO, SSE/HTTP transports).
- **Real-time Status Monitoring**: `lib/mcp/mcpManager.ts` polls status, caches in Redis.
- **Unified Management Interface**: `app/components/mcp-servers/mcp-servers-dashboard.tsx`.
- **Data Flow**:
    - Status: MCP services → Redis → `/api/mcp-servers` → UI.
    - Config: UI ↔ `/api/mcp-config` ↔ `config.json`.

## Networking & Communication

- **Internal Docker Network:** Service-to-service communication (e.g., `piper-db:5432`).
- **External Access:** `piper-app` at `http://localhost:8630`.
- **API Calls:** Client-side relative, server-side absolute via `serverFetch`.
- **Security**: Authelia 2FA. CSRF protection removed.