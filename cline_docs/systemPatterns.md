# System Patterns: Piper Application

## Core Architecture: Next.js + Docker + Prisma + Winston

- **Application Framework**: Next.js for frontend (React, App Router) and backend (API Routes).
- **Containerization**: Docker and Docker Compose (`docker-compose.dev.yml`, `dev.sh`).
- **Database Interaction**: Prisma ORM with PostgreSQL.
- **Logging Framework**: Winston for comprehensive, structured JSON logging.

## Key System Patterns & Technical Decisions:

### 1. Development Environment Setup (`docker-compose.dev.yml`)
    - Service orchestration via `dev.sh`.
    - `piper-app` startup: `sh -c "npx prisma db push && npm run dev"` (DB sync before dev server).
    - Hot reloading: Local source mounted (`.:/app`), isolated `node_modules`.
    - Environment variables: From `.env`, overridden in compose file.

### 2. Server-Side Fetch Utility (`lib/server-fetch.ts`)
    - `serverFetch`, `serverFetchJson` for absolute URL internal API calls.
    - Uses `NEXT_PUBLIC_APP_URL`.

### 3. MCP Server Management UI Pattern (Enhanced Dashboard)
    - Unified interface: `app/components/mcp-servers/mcp-servers-dashboard.tsx`.
    - Dual API integration: `/api/mcp-servers` (status), `/api/mcp-config` (CRUD).
    - State management: Dirty tracking, optimistic updates.
    - Modal-based CRUD: Comprehensive forms, transport-specific fields, validation.

### 4. CSRF Protection (Removed)
    - Rationale: Not needed due to Authelia 2FA.
    - Security reliance: Authelia 2FA for state-changing operations.

### 5. API Route Handling (Next.js)
    - Backend logic in `app/api/`.
    - Prisma client (`lib/prisma.ts`) for DB operations.

### 6. Database Schema Management (Prisma)
    - `prisma/schema.prisma` as source of truth.
    - `npx prisma db push` for dev schema sync.

### 7. Client-Side Data Fetching & State
    - Standard `fetch` for API calls.
    - UI error handling for API responses.
    - IndexedDB caching (`lib/chat-store/persist.ts`) via `idb-keyval`.

### 8. Configuration Management (`.env`, `config.json`)
    - `.env`: Secrets, DB connections, `NEXT_PUBLIC_APP_URL`.
    - `config.json`: MCP server configurations (STDIO, SSE/HTTP).

### 9. Docker Image Build (`Dockerfile.dev`)
    - Node.js base image, `npm install`, `/app` working directory.
    - Runs as root in dev for volume permissions.

### 10. Component Enhancement Pattern (Bivvy Climb System)
    - Structured development for major features (PRDs, task breakdowns).

### 11. Comprehensive Logging System (`lib/logger/`, `middleware/`)
    - **Centralized Winston Logger (`lib/logger/index.ts`)**:
        - Structured JSON logging format.
        - Multiple transports: Daily rotating files for app, error, MCP, AI SDK, HTTP.
        - Console transport for development with colorization.
        - Source-specific logger instances (e.g., `appLogger.mcp`, `appLogger.aiSdk`).
    - **Correlation ID Tracking (`lib/logger/correlation.ts`, `middleware/correlation.ts`)**:
        - `AsyncLocalStorage` for context propagation across async operations.
        - Middleware injects/extracts correlation IDs (e.g., `x-correlation-id`).
    - **Request/Response Logging (`middleware/logging.ts`)**:
        - Logs incoming requests and outgoing responses.
        - Includes timing, status codes, sanitized headers/body.
    - **Global Error Handling (`middleware/error-handler.ts`, `lib/logger/error-handler.ts`)**:
        - Centralized middleware (`nextErrorHandler`, `expressErrorHandlingMiddleware`).
        - Custom `AppError` class for standardized error objects.
        - Advanced error classification based on patterns (name, message, code).
        - User-friendly message generation.
        - Retry logic helpers (`shouldRetry`, `getRetryDelay`).
        - Handles unhandled promise rejections and uncaught exceptions.
    - **Specialized Loggers (`lib/logger/mcp-logger.ts`, `lib/logger/ai-sdk-logger.ts`)**:
        - `mcpLogger`: Logs JSON-RPC messages, server lifecycle events, tool execution (start/end, performance).
        - `aiSdkLogger`: Logs AI provider operations, model calls, streaming events, token usage, and costs.
    - **Log Security (`lib/logger/security.ts`)**:
        - PII detection using regex patterns (email, phone, SSN, credit card, API keys, JWTs).
        - Data masking for sensitive fields and PII in log messages and metadata (`[REDACTED]`).
        - Access control stubs for log viewer (role-based).
        - Audit logging for log access attempts.
    - **Log Rotation & Management (`lib/logger/rotation-config.ts`)**:
        - Winston DailyRotateFile for automated log rotation (`YYYY-MM-DD` pattern).
        - Configurable `maxSize`, `maxFiles`, compression.
        - Environment-specific rotation configurations (dev, prod, test).
        - Scheduled cleanup of old log files.
    - **Log Viewer & API (`app/components/log-viewer/`, `app/api/logs/`)**:
        - React component for viewing, filtering, and searching logs.
        - API endpoints for querying logs, exporting (JSON, CSV), and health checks.
    - **Middleware Integration (`middleware.ts`)**:
        - Orchestrates correlation, request logging, and error handling middleware for all matched requests.
        - Ensures correlation context is available throughout the request lifecycle.

### 12. Application Structure (Key Directories)
    - `app/`: Next.js App Router (pages, layouts, API routes).
    - `components/`: Shared React components (UI, common, motion, prompt-kit).
    - `lib/`: Core application logic (Prisma, MCP client, loggers, stores, utilities).
    - `middleware/`: Next.js middleware implementations.
    - `cline_docs/`: AI agent memory bank.
    - `docs/`: Project documentation (e.g., `logging-system.md`).
    - `logs/`: Runtime log file storage.