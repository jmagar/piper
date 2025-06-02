# Technical Context & Stack

## Core Technology Stack

### **Frontend Architecture**
- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript with strict type checking
- **UI Components**: shadcn/ui component library
- **Styling**: Tailwind CSS for responsive design
- **State Management**: React hooks with local storage persistence
- **Real-time Updates**: Polling-based with useEffect cleanup

### **Backend Infrastructure**
- **API Routes**: Next.js API routes with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Authelia 2FA integration (CSRF removed in favor of Authelia)
- **Logging**: Winston-based structured logging system

### **Enhanced MCP Client Stack**
- **Core SDK**: AI SDK v4 (`ai`, `@ai-sdk/openai`)
- **MCP Integration**: AI SDK MCP client with enhanced wrappers
- **Transport Support**: stdio, SSE, StreamableHTTP
- **Abort Signals**: Native Web API AbortController/AbortSignal
- **Metrics Collection**: Custom Prisma-based metrics system

## Development Environment

### **Package Management**
- **Runtime**: Node.js (containerized)
- **Package Manager**: npm with package-lock.json
- **Development**: Docker Compose for local development

### **Container Architecture**
```yaml
services:
  piper: # Main application
    - Next.js application with Enhanced MCP Client
    - Volume-mounted config at /config
    - Environment variables from .env
  
  piper-db: # PostgreSQL database
    - Persistent data storage
    - Prisma schema with MCP metrics tables
    - Real-time metrics collection active
```

### **Configuration Management**
- **Environment**: `/config/config.json` (volume-mounted)
- **MCP Servers**: JSON configuration with validation
- **Database**: `DATABASE_URL` environment variable
- **Uploads**: `/uploads` directory for file storage

## Enhanced MCP Client Technical Details

### **Core Dependencies**
```json
{
  "ai": "Latest - experimental_createMCPClient",
  "ai/mcp-stdio": "StdioMCPTransport support", 
  "@ai-sdk/openai": "GPT-4o-mini for tool repair",
  "zod": "Schema validation and type safety",
  "prisma": "Database ORM with PostgreSQL",
  "file-type": "MIME type detection for multi-modal"
}
```

### **Database Schema (Prisma)**
```prisma
model MCPServerMetric {
  id                String    @id @default(uuid())
  serverId          String    // Unique MCP server identifier
  serverName        String    // Human-readable name
  transportType     String    // 'stdio', 'sse', 'streamable-http'
  status            String    // 'connected', 'disconnected', 'error'
  connectionTime    DateTime
  lastActiveAt      DateTime?
  toolsCount        Int       @default(0)
  totalRequests     Int       @default(0)
  averageLatency    Float     @default(0)
  metadata          Json?
  
  toolExecutions    MCPToolExecution[]
}

model MCPToolExecution {
  id               String  @id @default(uuid())
  serverId         String
  toolName         String
  callId           String?
  executionTime    Float   // milliseconds
  success          Boolean
  errorType        String? // 'aborted', 'execution_error', etc.
  errorMessage     String?
  aborted          Boolean @default(false) // ✅ Abort tracking
  repairAttempts   Int     @default(0)
  retryCount       Int     @default(0)
  metadata         Json?
  executedAt       DateTime @default(now())
}
```

### **API Endpoints Architecture**

**Enhanced MCP Endpoints:**
- `GET /api/mcp-metrics` - Live server metrics and health data
- `GET /api/mcp-tool-executions` - Tool execution history with abort status
- `GET /api/mcp-abort-tool` - List active tool executions  
- `POST /api/mcp-abort-tool` - Abort control (individual/bulk/server-specific)

**Standard Endpoints:**
- `/api/mcp-config` - Server configuration management
- `/api/mcp-servers` - Server status and management
- `/api/chat` - Enhanced with abort error reporting

## Abort Signals Implementation

### **Technical Architecture**
```typescript
// Global abort controller tracking
const activeAbortControllers = new Map<string, AbortController>()

// Tool wrapper with abort signal support
async function wrapToolsWithAbortSignal(
  tools: AISDKToolCollection,
  globalAbortSignal?: AbortSignal
): Promise<AISDKToolCollection>

// Promise-based abort execution
async function executeWithAbort(
  tool: Record<string, unknown>,
  params: Record<string, unknown>,
  abortSignal: AbortSignal
): Promise<unknown>
```

### **Resource Management**
- **Auto-cleanup**: 5-minute timeout for stale abort controllers
- **Event listeners**: Proper cleanup on abort signal completion
- **Memory management**: Map-based tracking with automatic removal
- **Database persistence**: All abort actions recorded for analytics

## Real-time Dashboard Infrastructure

### **Component Architecture**
```typescript
// Real-time polling with cleanup
useEffect(() => {
  fetchActiveExecutions()
  const interval = setInterval(fetchActiveExecutions, 2000)
  return () => clearInterval(interval)
}, [])

// State management for abort operations
const [aborting, setAborting] = useState<Set<string>>(new Set())
```

### **UI Libraries & Patterns**
- **lucide-react**: Icon library for visual indicators
- **sonner**: Toast notifications for user feedback
- **Responsive design**: Mobile-first with desktop enhancements
- **Loading states**: Skeleton screens and progress indicators

## Development & Deployment

### **Build Process**
- **TypeScript**: Strict compilation with full type checking
- **ESLint**: Code quality and consistency checking
- **Prisma**: Database migration and type generation
- **Docker**: Multi-stage builds for production deployment

### **Environment Configuration**
```bash
# Core application
DATABASE_URL="postgresql://..."
CONFIG_DIR="/config"  # Volume-mounted configuration
UPLOADS_DIR="./uploads"  # File storage directory

# MCP Enhancement
OPENAI_API_KEY="sk-..."  # For tool repair functionality
```

### **Logging & Monitoring**
- **Winston logging**: Structured logs with correlation IDs
- **MCP logger**: Specialized logging for MCP operations
- **Real-time metrics**: Live collection to PostgreSQL
- **Performance tracking**: Execution times, success rates, abort patterns

## Security Considerations

### **Authentication & Authorization**
- **Authelia 2FA**: External authentication system
- **Session management**: Proper session handling and cleanup
- **API security**: Request validation and error handling

### **Resource Protection**
- **Abort controller limits**: Automatic cleanup prevents memory leaks
- **Database connections**: Prisma connection pooling
- **File upload validation**: MIME type checking and size limits
- **Error handling**: Graceful degradation and user feedback

## Performance Optimizations

### **Database Efficiency**
- **Indexed fields**: Strategic indexing for query performance
- **Aggregated metrics**: Real-time calculations with caching
- **Connection pooling**: Efficient database connection management

### **Frontend Performance**
- **Component optimization**: React.memo for expensive re-renders
- **Polling optimization**: Smart intervals with cleanup
- **State management**: Efficient state updates and batch operations

This technical stack provides **enterprise-grade reliability** while maintaining **developer productivity** and **system performance**.