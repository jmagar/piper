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

## Server Action Naming & React Context Boundary Architecture - **ESTABLISHED STANDARDS**

### **Next.js Server Action Naming Compliance**
- **Requirement**: All function props in client components must follow Next.js naming conventions
- **Pattern**: Function props must end with "Action" suffix or be named "action"
- **Examples**:
  ```typescript
  // ❌ Before (Naming violations)
  onClick?: (id: string) => void
  onChange?: (value: string) => void
  handleSubmit?: (e: FormEvent) => void
  onClose?: () => void
  
  // ✅ After (Compliant naming)
  onClickAction?: (id: string) => void
  onChangeAction?: (value: string) => void
  handleSubmitAction?: (e: FormEvent) => void
  onCloseAction?: () => void
  ```
- **Implementation**: Systematic renaming across all component prop types, internal references, and calling components
- **Components Updated**: DialogAgent, EditAgentForm, CreateRuleForm, EditRuleForm, and all their calling components

### **React Context Boundary Management**
- **Problem**: Client components using React Context (`createContext`) cannot be directly imported into Server Components
- **Root Cause**: `LayoutApp` component uses `useUserPreferences()` hook which depends on React Context
- **Solution Architecture**:
  ```typescript
  // ✅ Client Boundary Wrapper (app/components/layout/client-layout-wrapper.tsx)
  "use client"
  import { LayoutApp } from "@/app/components/layout/layout-app"
  
  export function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
    return <LayoutApp>{children}</LayoutApp>
  }
  
  // ✅ Server Component Usage
  import { ClientLayoutWrapper } from "@/app/components/layout/client-layout-wrapper"
  
  export default async function ServerPage() {
    return (
      <ClientLayoutWrapper>
        <ServerComponentContent />
      </ClientLayoutWrapper>
    )
  }
  
  // ✅ Client Component Usage (when full client-side is acceptable)
  "use client"
  import { LayoutApp } from "@/app/components/layout/layout-app"
  
  export default function ClientPage() {
    return (
      <LayoutApp>
        <ClientComponentContent />
      </LayoutApp>
    )
  }
  ```
- **Benefits Preserved**:
  - Server-side rendering for pages that need it
  - SEO optimization with `generateMetadata` functions
  - Database queries remain server-side for performance
  - Type safety maintained throughout component tree

### **Next.js App Router Parameter Handling**
- **Modern Pattern**: API routes and pages must handle Promise-based params in Next.js App Router
- **Implementation**:
  ```typescript
  // ✅ API Routes
  export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) {
    const { id } = await params
    // ... route logic
  }
  
  // ✅ Dynamic Pages
  export default async function Page({ 
    params 
  }: { 
    params: Promise<{ slug: string }> 
  }) {
    const { slug } = await params
    // ... page logic
  }
  ```
- **Routes Updated**: All `[id]` and `[slug]` dynamic routes across the application

## Logging System Architecture (`lib/logger/`, `middleware/`) - **FULLY FUNCTIONAL**

- **Core Logger (`lib/logger/index.ts`)**: 
    - Singleton `appLogger` (Winston instance) with multiple specialized sub-loggers.
    - **Structured JSON logging** for all file outputs.
    - **Static File Transports**: Uses static filenames instead of daily rotation:
      - `app.log` - General application logs (source: 'APPLICATION')
      - `ai-sdk.log` - AI SDK operations (source: 'AI_SDK')
      - `mcp.log` - MCP communications (source: 'MCP') 
      - `http.log` - HTTP requests/responses (source: 'HTTP')
      - `error.log` - Error logs (level: 'error')
    - **Separate Logger Instances**: Individual Winston loggers for each source to ensure proper file separation.
    - **File Size Rotation**: 20MB max file size with 5 backup files per log type.
    - Console transport for development with colorized output.
    - **Source-specific methods**: `appLogger.mcp.info()`, `appLogger.aiSdk.debug()`, etc.
- **Type Definitions (`lib/logger/types.ts`)**: TypeScript interfaces for `LogEntry`, `ClassifiedError`, `McpLogEntry`, `AiSdkLogEntry`, etc.
- **Correlation (`lib/logger/correlation.ts`, `middleware/correlation.ts`)**: 
    - `AsyncLocalStorage` for context propagation.
    - `correlationManager` singleton.
    - Middleware for `x-correlation-id` handling.
- **Request/Response Logging (`middleware/logging.ts`)**: `nextRequestLoggingMiddleware` for HTTP details → `http.log`.
- **Error Handling (`middleware/error-handler.ts`, `lib/logger/error-handler.ts`):
    - `nextErrorHandler`, `expressErrorHandlingMiddleware`.
    - `AppError` custom error class.
    - `ErrorClassifier` with pattern matching.
    - Global unhandled rejection/exception handlers.
- **Specialized Loggers:**
    - `McpLogger (`lib/logger/mcp-logger.ts`): JSON-RPC messages, server lifecycle, tool performance → `mcp.log`.
    - `AiSdkLogger (`lib/logger/ai-sdk-logger.ts`): AI operations, streaming, costs, token usage → `ai-sdk.log`.
- **Security (`lib/logger/security.ts`)**:
    - `logSecurity` singleton.
    - PII detection (regex for email, phone, API keys, etc.) and masking (`[REDACTED]`).
    - Sensitive field name redaction.
- **File Management**:
    - **Static Filenames**: Easier log file management and parsing.
    - **Size-based Rotation**: Winston File transport with `maxsize`/`maxFiles` instead of daily rotation.
    - **Source Filtering**: Each logger instance writes only to its designated file.
- **Log Viewer Component (`app/components/log-viewer/index.tsx`)**: React component for log display, filtering, search.
- **Middleware Integration (`middleware.ts`):** Orchestrates all logging-related middleware.
- **🔥 Implementation Notes**:
    - **Import Issue Resolved**: Conflicting `lib/logger.ts` file removed to fix import resolution.
    - **Flexible Metadata Handling**: Supports strings, numbers, objects in log metadata.
    - **TypeScript Compliance**: All exports properly defined, no linter errors.
    - **Verified Functional**: File logging confirmed working with proper source separation.

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

## Development Workflow & Containerization

- **Container Management**: User-controlled container lifecycle (bring down, rebuild)
- **Hot Reloading**: Functional within container via volume mounting (`.:/app`)
- **Environment Isolation**: Consistent development environment across systems
- **TypeScript Compliance**: Zero linter errors maintained for clean development experience
- **Architecture Standards**: Established patterns for Server/Client boundaries and naming conventions