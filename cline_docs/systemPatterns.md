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

### 11. Header UI Enhancement Patterns - **ESTABLISHED**
    - **Theme Toggle Component Pattern**:
        - Location: `app/components/layout/theme-toggle.tsx`
        - Implementation: Dropdown menu with Light/Dark/System options
        - Integration: Uses `next-themes` provider for theme management
        - Features: Dynamic icon display (Sun/Moon), proper hydration handling, accessibility support
        - Design: Consistent with existing header button styling and spacing
        - Placement: Between MCP Servers button and Agent Link for logical grouping
    - **Consistent Sidebar Toggle Pattern**:
        - Always render sidebar toggle regardless of layout preferences
        - Remove conditional rendering based on `hasSidebar` prop
        - Always render `<AppSidebar />` component for consistent user control
        - Pattern ensures users always have access to navigation regardless of current state

### 12. AI Response Streaming Architecture - **CRITICAL PERFORMANCE PATTERN**
    - **Problem Pattern to Avoid**: Never use `await result.consumeStream()` in streaming endpoints
        - **Anti-pattern**: `await result.consumeStream()` blocks streaming and defeats progressive response display
        - **Correct Pattern**: Let `toDataStreamResponse()` handle streaming directly to client
    - **Proper Streaming Implementation**:
        ```typescript
        // ✅ Correct streaming pattern
        const result = streamText({
          model: openrouter.chat(model),
          system: systemPrompt,
          messages,
          tools: toolsToUse,
          onError: (event) => { /* error handling */ },
          onFinish: async ({ response }) => { /* completion handling */ }
        })
        
        // ✅ Return streaming response directly - DO NOT consume stream
        return result.toDataStreamResponse({
          sendReasoning: true,
          sendSources: true,
        })
        ```
    - **Client-Side Streaming Handling**:
        - Uses `useChat` from `@ai-sdk/react` for automatic streaming support
        - Status tracking: "streaming" → "ready" flow through component hierarchy
        - Progressive UI updates in `MessageAssistant` component during streaming
        - Proper loading states and user feedback during response generation
    - **Performance Impact**: 
        - Proper streaming: ~300ms to first content, progressive display
        - Blocked streaming: 3-15 seconds wait, complete response at once
        - User experience improvement: ~90% reduction in perceived response time

### 13. 3-Way @mention System Architecture - **REVOLUTIONARY PATTERN ESTABLISHED**
    - **Complete Integration Pattern**: Unified @mention system supporting agents, tools, AND database rules
    - **3-Way Fuzzy Matching Algorithm**: 
        - Intelligent detection in `use-agent-command.ts` determines mention type based on user input
        - Lowered trigger threshold to 5 for better responsiveness
        - Combines fuzzy scoring with direct string matching for optimal UX
        - Single hook manages state for all three mention types (agents, tools, rules)
    - **Dropdown Component Pattern**:
        - `AgentCommand`: Shows available chat agents for switching
        - `ToolCommand`: Shows MCP tools with server labels for execution
        - `RuleCommand`: Shows database rules with slug badges for context injection
        - Consistent keyboard navigation and click handling across all three
    - **Data Structure Patterns**:
        - **Tool Mentions**: `@toolname({"parameter":"value"})` format with parameter parsing
        - **Rule Mentions**: `@rule-slug` format (no parentheses) for clean injection
        - **Agent Mentions**: Standard agent selection pattern
    - **API Integration Pattern**:
        - `/api/rules-available` endpoint fetches database rules for dropdown
        - Server-side processing in chat API for rule context injection
        - Comprehensive error handling for missing/invalid rules
    - **Context Enhancement Pattern**:
        - Rule content injected into enhanced system prompt before AI processing
        - Transparent rule application - users see enhanced AI responses naturally
        - Rule mentions stripped from user message after processing
    - **Performance**: Zero impact on existing functionality, maintains streaming performance

### 14. Server Action Naming Conventions & React Context Boundaries - **ESTABLISHED PATTERNS**
    - **Next.js Server Action Compliance**:
        - All function props in client components must end with "Action" suffix or be named "action"
        - Pattern: `onClick` → `onClickAction`, `onChange` → `onChangeAction`, `handleSubmit` → `handleSubmitAction`
        - Enforced throughout component hierarchy (prop types, internal references, calling components)
    - **React Context Boundary Management**:
        - **Problem**: Client components using React Context cannot be directly imported into Server Components
        - **Solution Pattern**: `ClientLayoutWrapper` component as boundary wrapper
        - **Implementation**:
            ```typescript
            // ✅ For Server Components that need client layout
            import { ClientLayoutWrapper } from "@/app/components/layout/client-layout-wrapper"
            
            // ✅ For pages that can be fully client-side
            "use client"
            import { LayoutApp } from "@/app/components/layout/layout-app"
            ```
    - **Next.js App Router Parameter Handling**:
        - **Pattern**: API routes and pages must handle Promise-based params
        - **Implementation**: `const { id } = await params` instead of direct destructuring
        - **Routes**: All dynamic `[id]` and `[slug]` routes updated for async params
    - **Critical Bug Prevention**:
        - Always verify prop passing in component hierarchies (especially `id` props)
        - Maintain consistency between prop type definitions and usage
        - Use proper JSX escaping for apostrophes (`&apos;`)

### 14. Comprehensive Logging System (`lib/logger/`, `middleware/`) - **FULLY FUNCTIONAL**
    - **Centralized Winston Logger (`lib/logger/index.ts`)**:
        - Structured JSON logging format for all file outputs.
        - **Static File Logging**: Uses static filenames (`app.log`, `ai-sdk.log`, `mcp.log`, `http.log`, `error.log`) instead of date-stamped rotation.
        - **Separate Logger Instances**: Individual Winston logger instances for each source to ensure proper file separation.
        - **File Size Rotation**: 20MB max file size with 5 backup files per log type.
        - Console transport for development with colorization and structured output.
        - **Source-specific logger methods** (e.g., `appLogger.mcp.info()`, `appLogger.aiSdk.debug()`).
    - **Correlation ID Tracking (`lib/logger/correlation.ts`, `middleware/correlation.ts`)**:
        - `AsyncLocalStorage` for context propagation across async operations.
        - Middleware injects/extracts correlation IDs (e.g., `x-correlation-id`).
    - **Request/Response Logging (`middleware/logging.ts`)**:
        - Logs incoming requests and outgoing responses to dedicated HTTP log file.
        - Includes timing, status codes, sanitized headers/body.
    - **Global Error Handling (`middleware/error-handler.ts`, `lib/logger/error-handler.ts`)**:
        - Centralized middleware (`nextErrorHandler`, `expressErrorHandlingMiddleware`).
        - Custom `AppError` class for standardized error objects.
        - Advanced error classification based on patterns (name, message, code).
        - User-friendly message generation.
        - Retry logic helpers (`shouldRetry`, `getRetryDelay`).
        - Handles unhandled promise rejections and uncaught exceptions.
    - **Specialized Loggers (`lib/logger/mcp-logger.ts`, `lib/logger/ai-sdk-logger.ts`)**:
        - `mcpLogger`: Logs JSON-RPC messages, server lifecycle events, tool execution (start/end, performance) to `mcp.log`.
        - `aiSdkLogger`: Logs AI provider operations, model calls, streaming events, token usage, and costs to `ai-sdk.log`.
    - **Log Security (`lib/logger/security.ts`)**:
        - PII detection using regex patterns (email, phone, SSN, credit card, API keys, JWTs).
        - Data masking for sensitive fields and PII in log messages and metadata (`[REDACTED]`).
        - Access control stubs for log viewer (role-based).
        - Audit logging for log access attempts.
    - **Log File Management**:
        - **Static Filenames**: `app.log`, `ai-sdk.log`, `mcp.log`, `http.log`, `error.log` for easier management.
        - **Size-based Rotation**: Winston File transport with `maxsize` and `maxFiles` configuration.
        - **Source Filtering**: Each source writes only to its designated file through separate logger instances.
    - **Log Viewer & API (`app/components/log-viewer/`, `app/api/logs/`)**:
        - React component for viewing, filtering, and searching logs.
        - API endpoints for querying logs, exporting (JSON, CSV), and health checks (`/api/logs/health` ⭐ **VERIFIED WORKING**).
    - **Middleware Integration (`middleware.ts`)**:
        - Orchestrates correlation, request logging, and error handling middleware for all matched requests.
        - Ensures correlation context is available throughout the request lifecycle.
    - **🔥 Critical Implementation Notes**:
        - **Import Resolution**: Conflicting `lib/logger.ts` file was removed to ensure proper imports to `lib/logger/index.ts`.
        - **Flexible Metadata**: Supports various data types (strings, numbers, objects) in log metadata.
        - **TypeScript Compliance**: All exports properly defined, no linter errors.
        - **Production Ready**: File logging verified functional with proper source separation.

### 15. Application Structure (Key Directories)
    - `app/`: Next.js App Router (pages, layouts, API routes).
    - `components/`: Shared React components (UI, common, motion, prompt-kit).
    - `lib/`: Core application logic (Prisma, MCP client, loggers, stores, utilities).
    - `middleware/`: Next.js middleware implementations.
    - `cline_docs/`: AI agent memory bank.
    - `docs/`: Project documentation (e.g., `logging-system.md`).
    - `logs/`: Runtime log file storage.

### 16. Containerized Development Workflow
    - **Container Lifecycle**: User manages container bring-down and rebuild process
    - **Hot Reloading**: Functional within container boundaries via volume mounting
    - **Environment Isolation**: Container provides consistent development environment
    - **Deployment Pattern**: Self-contained containerized application ready for production