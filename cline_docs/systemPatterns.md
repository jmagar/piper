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

### 11. Hydration Safety Architecture - **CRITICAL PATTERN ESTABLISHED**
    - **React Hydration Mismatch Prevention**: Prevent server-client DOM structure differences
    - **SSR-Compatible Component Design**:
        ```typescript
        // ✅ Hydration-safe pattern
        const [isHydrated, setIsHydrated] = useState(false)
        
        useEffect(() => {
          setIsHydrated(true)
        }, [])
        
        // Conditional rendering for client-only features
        if (!isHydrated) {
          return <div>Loading...</div> // Simple server-rendered fallback
        }
        
        return <ClientOnlyComponent /> // Complex client features
        ```
    - **Progressive Enhancement Pattern**:
        - Start with CSS-only implementations for critical functionality
        - Upgrade to React components after hydration is complete
        - Ensure identical DOM structure between server and client rendering
    - **localStorage Access Pattern**:
        ```typescript
        // ✅ Safe localStorage access
        const [isHydrated, setIsHydrated] = useState(false)
        const [preferences, setPreferences] = useState(defaultPreferences)
        
        useEffect(() => {
          setIsHydrated(true)
          // Only access localStorage after hydration
          const stored = localStorage.getItem('preferences')
          if (stored) setPreferences(JSON.parse(stored))
        }, [])
        ```
    - **Error Boundary Pattern**: Wrap hydration-sensitive components in error boundaries
    - **Defensive Programming**: Type guards and validation for all data flow

### 12. PWA Offline Indicator Pattern - **ESTABLISHED FOR HYDRATION SAFETY**
    - **Pure CSS Animation Implementation**: Avoid React animation libraries for critical PWA components
        ```css
        /* ✅ Hydration-safe CSS animations */
        @keyframes slideInFadeIn {
          0% { opacity: 0; transform: translateY(-10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slideOutFadeOut {
          0% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-10px); }
        }
        
        .notification-enter {
          animation: slideInFadeIn 300ms ease-out forwards;
        }
        
        .notification-exit {
          animation: slideOutFadeOut 300ms ease-out forwards;
        }
        ```
    - **State Management for Animations**:
        ```typescript
        // ✅ Simple boolean state for exit animations
        const [isExiting, setIsExiting] = useState(false)
        
        const handleClose = () => {
          setIsExiting(true)
          setTimeout(() => {
            setIsOnline(false)
            setIsExiting(false)
          }, 300) // Match CSS animation duration
        }
        ```
    - **Consistent Rendering**: Same DOM structure and CSS classes on server and client
    - **Immediate Responsiveness**: Zero artificial delays for connectivity feedback
    - **Performance Benefits**: Native CSS animations outperform JavaScript solutions

### 13. Header UI Enhancement Patterns - **ESTABLISHED**
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

### 14. AI Response Streaming Architecture - **CRITICAL PERFORMANCE PATTERN**
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

### 15. AttachMenu Integration with @mention Simulation - **REVOLUTIONARY UX PATTERN ESTABLISHED**
    - **Perfect UX Bridge Pattern**: Unified discoverability interface that elegantly triggers existing @mention system
    - **@mention Simulation Architecture**:
        ```typescript
        // ✅ Elegant simulation pattern - Zero code duplication
        const handleSectionSelect = (section: string) => {
          setIsOpen(false) // Close dropdown
          
          switch (section) {
            case 'agents':
            case 'tools':
            case 'rules':
              onTriggerMention('@') // Add @ to input and focus
              break
            case 'files':
              // File upload handled by FileUpload component
              break
          }
        }
        
        // In chat-input.tsx:
        onTriggerMention={(prefix) => {
          const newValue = value + prefix
          onValueChange(newValue)
          setTimeout(() => {
            agentCommand.textareaRef.current?.focus()
          }, 10)
        }}
        ```
    - **Menu Categories Pattern**:
        - **📚 Rules** → `@` simulation triggers rule @mention system
        - **🤖 Agents** → `@` simulation triggers agent @mention system  
        - **🔧 Tools** → `@` simulation triggers tool @mention system
        - **📁 Files** → Direct FileUpload component integration
        - **✨ Prompts** → Future extensibility pattern
        - **🔗 URLs** → Future extensibility pattern
    - **Smart Vision Detection Pattern**:
        ```typescript
        // ✅ Robust vision support detection with fallbacks
        function hasVisionSupport(modelId: string): boolean {
          // 1. Exact match in MODELS array
          const exactMatch = MODELS.find(m => m.id === modelId);
          if (exactMatch) return exactMatch.vision || false;
          
          // 2. Model name pattern matching
          if (modelId.includes('claude-4') || modelId.includes('gpt-4')) return true;
          
          // 3. Provider-based fallback logic
          const similarModels = MODELS.filter(m => 
            m.vision && matchesProvider(m.id, modelId)
          );
          
          return similarModels.length > 0;
        }
        ```
    - **Mobile-Optimized Responsive Pattern**:
        - Touch-friendly: 44px minimum touch targets
        - Responsive dropdowns: `w-48` mobile, `w-52` desktop
        - Adaptive button sizing: `min-h-[44px]` mobile, `size-9` desktop
        - Flexible layouts: `flex-shrink-0` icons, proper padding hierarchy
    - **Integration Benefits**:
        - Zero code duplication (reuses all existing @mention components)
        - Perfect consistency (identical UX to manual "@" typing)
        - Battle-tested patterns (leverages proven @mention architecture)
        - Future-ready extensibility (easy to add Prompts, URLs categories)

### 16. Modern File Upload Architecture - **AI SDK PATTERN COMPLIANCE**
    - **Direct File Passing Pattern**: Eliminated complex pre-upload pipeline
        ```typescript
        // ✅ Modern AI SDK pattern - Direct file passing
        experimental_attachments: files.map(file => ({
          name: file.name,
          contentType: file.type,
          url: URL.createObjectURL(file)
        }))
        
        // ❌ Old pattern - Complex pre-upload (REMOVED)
        // 1. Upload files to /api/uploads
        // 2. Store in filesystem  
        // 3. Create attachment objects
        // 4. Pass URLs to chat API
        ```
    - **Simplified State Management**:
        ```typescript
        // ✅ Simple, focused hook pattern
        export function useFileUpload() {
          const [files, setFiles] = useState<File[]>([])
          
          const handleFileUpload = (newFiles: File[]) => {
            setFiles(prev => [...prev, ...newFiles])
          }
          
          const handleFileRemove = (fileToRemove: File) => {
            setFiles(prev => prev.filter(f => f !== fileToRemove))
          }
          
          return { files, handleFileUpload, handleFileRemove }
        }
        ```
    - **Enhanced Validation Pattern**:
        - UI-layer validation with immediate toast feedback
        - File size, type, and content validation before state updates
        - Graceful error handling with user-friendly messages
        - Maintained all existing validation logic
    - **Performance Benefits**:
        - Eliminated network round-trip for file upload
        - Memory efficient direct AI SDK processing
        - Better UX: immediate file processing vs two-step flow
        - Reduced codebase complexity by ~30%
    - **Backwards Compatibility**:
        - Preserved `/api/uploads/[...path]` route for serving existing files
        - All existing file display components work unchanged
        - Message history with attachments remains functional
        - No data migration required

### 17. 3-Way @mention System Architecture - **REVOLUTIONARY PATTERN ESTABLISHED**
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

### 18. Server Action Naming Conventions & React Context Boundaries - **ESTABLISHED PATTERNS**
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

### 19. Container Lifecycle Management - **CRITICAL DEVELOPMENT PATTERN**
    - **Server Action ID Synchronization**: Container restarts regenerate Server Action IDs
        - **Problem**: "Failed to find Server Action" errors when client has cached stale action IDs
        - **Solution Pattern**: Restart piper-app container + hard browser refresh
        - **Implementation**: `docker-compose restart piper-app` followed by `Ctrl+Shift+R`
        - **Prevention**: Regular container restarts during active development
    - **Client-Server Build Consistency**:
        - **Hot Reloading Limitations**: Some changes require full container rebuild
        - **Build Artifact Management**: Clear browser cache after container operations
        - **Development Workflow**: Monitor for Server Action errors as indicator of sync issues
    - **Container State Management**:
        - **User-Controlled Lifecycle**: Developers manage container bring-down and rebuild
        - **Volume Mounting**: Source code changes reflected via hot reloading
        - **Environment Isolation**: Consistent development environment across systems
    - **Debug Pattern for Server Action Issues**:
        ```bash
        # ✅ Container restart pattern
        docker-compose restart piper-app
        # Then hard refresh browser (Ctrl+Shift+R)
        ```

### 20. Comprehensive Logging System (`lib/logger/`, `middleware/`) - **FULLY FUNCTIONAL**
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

### 21. Application Structure (Key Directories)
    - `app/`: Next.js App Router (pages, layouts, API routes).
    - `components/`: Shared React components (UI, common, motion, prompt-kit).
    - `lib/`: Core application logic (Prisma, MCP client, loggers, stores, utilities).
    - `middleware/`: Next.js middleware implementations.
    - `cline_docs/`: AI agent memory bank.
    - `docs/`: Project documentation (e.g., `logging-system.md`).
    - `logs/`: Runtime log file storage.

### 22. Containerized Development Workflow
    - **Container Lifecycle**: User manages container bring-down and rebuild process
    - **Hot Reloading**: Functional within container boundaries via volume mounting
    - **Environment Isolation**: Container provides consistent development environment
    - **Deployment Pattern**: Self-contained containerized application ready for production

### 23. Documentation Consolidation & MECE Analysis Methodology - **ESTABLISHED PATTERN**
    - **MECE (Mutually Exclusive, Collectively Exhaustive) Investigation**: Systematic approach to technical analysis
        - **Problem Identification**: Use MECE to categorize overlapping or contradictory information
        - **Feature Analysis**: Categorize features as "Documented but NOT Implemented" vs "Working but Under-documented"
        - **Implementation Verification**: Check every documented claim against actual source code
        - **Gap Analysis**: Identify missing documentation or implementation gaps systematically
    - **Documentation Consolidation Pattern**:
        ```markdown
        # Pattern: Multiple docs → Single source of truth
        
        ## Investigation Process:
        1. **Inventory Phase**: List all documentation files for same topic
        2. **Content Analysis**: Map claims to actual implementation
        3. **MECE Categorization**: 
           - ✅ Working Features (verified in code)
           - 🔮 Planned Features (infrastructure exists)
           - 📚 Documented but Missing (claims not found in code)
           - 🔧 Working but Undocumented (found in code but not documented)
        4. **Consolidation**: Create single file with accurate, verified information
        5. **Cleanup**: Remove overlapping/contradictory documentation
        ```
    - **Implementation-First Documentation**:
        - **Source Code Authority**: Always verify documentation against actual implementation
        - **Technical Accuracy**: All examples and configurations must match real system
        - **Feature Status Transparency**: Clearly separate working vs planned features
        - **Real Examples**: Use actual working code examples, not theoretical ones
    - **Enhanced MCP Client Documentation Example**:
        - **Problem**: 3 overlapping docs with conflicting information about Enhanced MCP Client
        - **Solution**: MECE analysis revealed 70% infrastructure vs 30% active implementation
        - **Result**: Single unified doc (`docs/enhanced-mcp-client-unified.md`) with implementation-verified accuracy
        - **Benefits**: Eliminated confusion, provided reliable technical reference, maintainable single source
    - **Documentation Maintenance Patterns**:
        - **Single Source of Truth**: Prefer one comprehensive file over multiple partial files
        - **Implementation Coupling**: Update documentation when implementation changes
        - **Version Control**: Track documentation changes alongside code changes
        - **User-Centric Organization**: Structure by what users need to know, not internal architecture
    - **Quality Control Patterns**:
        - **Verification Requirement**: All technical claims must be verifiable in codebase
        - **Example Testing**: All code examples must be tested and working
        - **Configuration Validation**: All environment variables and config examples must be real
        - **API Documentation**: All endpoints must exist and return documented response structures

## Enhanced MCP Client Architecture

### **Core Pattern: Layered Enhancement Over AI SDK**

The system follows a **wrapper enhancement pattern** that extends the base AI SDK MCP capabilities:

```
User Application
    ↓
Enhanced MCP Client (lib/mcp/enhanced-mcp-client.ts)
    ↓
AI SDK MCP Client (ai/experimental_createMCPClient)
    ↓ 
Transport Layer (stdio/SSE/StreamableHTTP)
```

### **Abort Signal Pattern**

**Tool Wrapper Architecture:**
```typescript
// Pattern: Wrap existing tools with abort signal support
async function wrapToolsWithAbortSignal(
  tools: AISDKToolCollection,
  globalAbortSignal?: AbortSignal
): Promise<AISDKToolCollection>
```

**Key Design Decisions:**
- **Non-invasive**: Wraps existing tools without modifying core AI SDK
- **Composable**: Global + per-tool abort signals combine gracefully
- **Auto-cleanup**: 5-minute timeout prevents memory leaks
- **Database tracking**: All abort actions persisted for analytics

### **Metrics Collection Pattern**

**Centralized Collector:**
```typescript
class MCPMetricsCollector {
  // Pattern: Single responsibility for all metrics
  recordServerConnection()
  recordToolExecution() 
  recordServerError()
  getServerMetrics()
}
```

**Database Schema Pattern:**
- `MCPServerMetric`: Server-level aggregated metrics
- `MCPToolExecution`: Individual execution tracking
- **Relationship**: One-to-many with proper indexing

### **Real-time Monitoring Pattern**

**Dashboard Component Architecture:**
```
Health Check Tab
├── ActiveExecutions (Real-time with 2s polling)
├── SystemHealthDiagnostics (Static status)
└── FeatureStatusMatrix (Configuration display)
```

**API Design Pattern:**
- `GET /api/mcp-abort-tool` - List active executions
- `POST /api/mcp-abort-tool` - Control operations (abort/abort-all/abort-server)
- **Stateful**: Global Map tracks active AbortControllers

## Connection Management Patterns

### **Enhanced Client Factory Pattern**

```typescript
// Pattern: Factory functions for different transports
createEnhancedStdioMCPClient(config: EnhancedStdioConfig)
createEnhancedSSEMCPClient(config: EnhancedSSEConfig)  
createEnhancedStreamableHTTPMCPClient(config: EnhancedStreamableHTTPConfig)
```

**Configuration Enhancement:**
- All configs extend base with `abortSignal?`, `timeout?`, `clientName?`
- **Backward compatible**: Existing code works unchanged
- **Forward compatible**: New features opt-in via config

### **Connection Pool Pattern**

```typescript
class MCPConnectionPool {
  // Pattern: Centralized lifecycle management
  private clients = new Map<string, MCPToolSet>()
  private abortControllers = new Map<string, AbortController>()
}
```

## Error Handling Patterns

### **Layered Error Strategy**

1. **Transport Level**: Connection failures, timeouts
2. **Enhanced Client Level**: Abort signals, custom errors  
3. **Application Level**: User-friendly messages, retry logic

**Custom Error Classes:**
```typescript
class MCPClientError extends Error // Enhanced client errors
class CallToolError extends Error   // Tool execution errors
```

### **Tool Call Repair Pattern (Ready for Implementation)**

```typescript
class ToolCallRepairer {
  // Pattern: AI-powered error recovery
  async repairToolCall(context: ToolCallRepairContext): Promise<ToolCallRepairResult>
}
```

**Repair Strategies:**
- `ai_repair`: GPT-4o-mini fixes malformed JSON
- `schema_coercion`: Type conversion and validation
- `default_values`: Add missing required fields  
- `retry_original`: Simple retry for timeouts

## UI/Dashboard Patterns

### **Three-Tier Monitoring Navigation**

```
Dashboard → Monitoring → [Overview|Performance|Health]
                           ↓
                      System Overview: Live metrics
                      Tool Performance: Execution history  
                      Health Check: Active executions + diagnostics
```

### **Real-time Component Pattern**

**ActiveExecutions Component:**
- **Polling Strategy**: 2-second intervals with cleanup
- **State Management**: Loading, aborting, error states
- **UI Feedback**: Visual progress indicators, toast notifications

### **Filter-Enhanced History Pattern**

**ToolExecutionHistory Component:**
- **Multi-filter**: Status (all/success/error/aborted) + Server selection
- **Visual Distinction**: Color-coded badges (green/red/orange)
- **Performance Insights**: Success rates, execution times, popular tools

## Database Integration Patterns

### **Metrics Persistence Strategy**

**Server Metrics Aggregation:**
- Real-time updates on tool execution
- Running averages for latency calculation
- Connection lifecycle tracking

**Tool Execution Tracking:**
- Individual execution records with full metadata
- Abort status tracking with error categorization
- Performance metrics with repair attempt counts

### **Schema Evolution Pattern**

**Backward Compatible Additions:**
- `aborted` field added to existing `MCPToolExecution` model
- Optional fields for future enhancements
- Indexed fields for query performance

## Security & Resource Management

### **Abort Controller Lifecycle**

**Pattern: Automatic Cleanup**
```typescript
// Auto-cleanup after 5 minutes
setTimeout(() => {
  if (activeAbortControllers.has(callId)) {
    activeAbortControllers.delete(callId)
  }
}, 5 * 60 * 1000)
```

### **Resource Management Strategy**

- **Connection Pooling**: Reuse MCP clients when possible
- **Memory Management**: Automatic cleanup of abort controllers
- **Database Efficiency**: Proper indexing and query optimization
- **Network Optimization**: Cancel requests on abort signals

## Integration Patterns

### **Backward Compatibility Strategy**

All enhancements are **non-breaking**:
- Existing `mcpManager.ts` continues to work unchanged
- Enhanced features are opt-in via configuration
- Helper functions maintain existing API contracts

### **Forward Compatibility Hooks**

- Multi-modal content infrastructure ready for implementation
- Tool call repair system can be enabled via configuration
- Analytics and advanced monitoring hooks prepared

This architecture provides **enterprise-grade MCP tooling** while maintaining simplicity and reliability for standard use cases.