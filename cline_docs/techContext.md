# Technical Context: Piper Production Environment

## Technologies Used

### **Core Application Stack**
- **Runtime**: Node.js 18+ with TypeScript 5.x
- **Framework**: Next.js 14 with App Router
- **Database**: PostgreSQL 15+ with Prisma ORM
- **Caching**: Redis 7+ with ioredis client
- **Container**: Docker with multi-stage builds

### **AI Integration Stack**
- **AI SDK**: Vercel AI SDK 3.x (`ai@3.0.0-experimental.19+`)
- **LLM Provider**: OpenRouter (Anthropic Claude 4, GPT-4, etc.)
- **Streaming**: Real-time response streaming with tool execution
- **Tool Management**: Custom MCP integration with chunked response processing

### **MCP (Model Context Protocol) Integration**
- **Core Library**: `@model-context/node` with `experimental_createMCPClient`
- **Protocol Version**: MCP 2024-11-05 specification compliance
- **Transport Types**: 
  - **stdio**: Local command execution (Python uvx, Node.js scripts)
  - **SSE**: HTTP Server-Sent Events for remote services
- **Server Types**: 19+ active servers (Python, Node.js, HTTP services)

### **Development & Production Tools**
- **Build**: TypeScript compilation with strict mode
- **Linting**: ESLint with Next.js rules + Prettier
- **Package Management**: npm with lockfile version 3
- **Python Support**: UV package manager (`uv` binary in PATH)
- **Container Orchestration**: Docker Compose with named volumes

## Production Deployment Architecture

### **Unraid Host Environment**
- **OS**: Unraid 6.12.24-Unraid (Linux kernel)
- **Docker Runtime**: Community Applications with proper networking
- **Host IP**: 10.1.0.2 (critical for container-to-host communication)
- **Storage**: Unraid array with persistent Docker volumes

### **Container Configuration**
```yaml
# docker-compose.yml key patterns
services:
  piper-app:
    build: .
    ports: ["8630:3000"]
    environment:
      DATABASE_URL: postgresql://user:pass@piper-db:5432/piper
      REDIS_URL: redis://piper-cache:6379
    volumes:
      - ./config.json:/app/config.json:ro
      - piper-uploads:/app/uploads
      
  piper-db:
    image: postgres:15-alpine
    volumes: [piper-db-data:/var/lib/postgresql/data]
    
  piper-cache:
    image: redis:7-alpine
    command: redis-server --save 20 1 --loglevel warning
    volumes: [piper-cache-data:/data]
```

### **Dockerfile Production Patterns**
```dockerfile
# Python MCP Server Support (Critical)
RUN curl -LsSf https://astral.sh/uv/install.sh | sh && \
    mv ~/.local/bin/uv* /usr/local/bin/ && \
    chmod +x /usr/local/bin/uv*

# Prisma Client Generation (Required)
RUN npx prisma generate

# Proper .dockerignore (Build optimization)
node_modules
.next
.git
logs
.env*
```

## Development Environment Setup

### **Local Development Requirements**
- **Node.js**: Version 18+ with npm 9+
- **Docker**: Docker Desktop or Docker Engine with Compose V2
- **Python**: Optional for local MCP server development
- **Git**: Version control with standard workflows

### **Environment Variables**
```bash
# .env file structure
DATABASE_URL=postgresql://user:password@localhost:5432/piper
REDIS_URL=redis://localhost:6379
OPENROUTER_API_KEY=sk-or-v1-...
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=http://localhost:3000
```

### **Development Commands**
```bash
# Start development server
npm run dev

# Database operations
npx prisma db push
npx prisma generate
npx prisma studio

# Docker services
docker compose up -d piper-db piper-cache
docker compose build piper-app
```

## Technical Constraints & Solutions

### **Unraid Docker Networking (Critical)**
- **Problem**: `localhost` doesn't resolve from containers to Unraid host services
- **Solution**: Use Unraid host IP (`10.1.0.2`) for all MCP server URLs
- **Pattern**: Replace `localhost:PORT` with `10.1.0.2:PORT` in `config.json`

### **Python MCP Server Support**
- **Problem**: `uvx` command not found in Docker container PATH
- **Solution**: Install `uv` globally and ensure proper PATH configuration
- **Verification**: `which uvx` should return `/usr/local/bin/uvx`

### **MCP Protocol Implementation**
- **Critical Requirement**: Must send `initialized` notification after handshake
- **Common Error**: "Received request before initialization was complete"
- **Solution**: Proper sequence: `initialize` → response → `notifications/initialized`

### **Large Response Processing**
- **Problem**: 64k+ character tool responses cause slow AI processing
- **Solution**: Smart chunking with tool-specific processors
- **Result**: 64k HTML → 2.5k structured JSON with importance ranking

### **Redis Authentication**
- **Problem**: `NOAUTH Authentication required` errors
- **Solution**: Use clean Redis without authentication, reset volume if needed
- **Command**: `docker volume rm piper_piper-cache` to reset state

## Performance Optimizations

### **Tool Response Processing**
- **Chunking Threshold**: 5000 characters
- **Processing Types**:
  - **HTML (fetch)**: Title + Meta + Content sections + Headings
  - **JSON (search)**: Result summaries with importance weighting  
  - **Text (generic)**: Sentence-based chunking with 2000 char limits

### **Token Management**
- **Max Tokens**: 8096 (optimal balance for Claude 4)
- **Streaming**: Real-time response delivery with proper error boundaries
- **Memory**: Conversation context managed by Vercel AI SDK

### **Caching Strategy**
- **MCP Status**: Redis cache with 300s TTL
- **Polling Interval**: 60 seconds for server health checks
- **Development**: HMR-safe state persistence on `globalThis`

## Build Optimization

### **Docker Build Context**
- **Before**: 860MB with node_modules, .next, logs
- **After**: ~17KB with proper .dockerignore
- **Build Time**: ~70 seconds for complete build

### **TypeScript Compilation**
- **Strict Mode**: Enabled with comprehensive type checking
- **Generated Types**: Prisma client generation in build process
- **Error Handling**: All type errors resolved for clean builds

## Debugging & Monitoring

### **Logging Strategy**
```typescript
// MCP Manager logging pattern
console.log(`[MCP Manager] ${operation}: ${details}`);
console.error(`[MCP Manager] Error ${operation}:`, error);
```

### **Health Monitoring**
- **MCP Server Status**: Redis-cached with dashboard display
- **Tool Execution**: Real-time logging with performance metrics
- **Error Tracking**: Comprehensive error boundaries with stack traces

### **Development Tools**
- **Hot Reload**: Next.js HMR with MCP service persistence
- **Database GUI**: Prisma Studio for database inspection
- **Redis CLI**: Direct cache inspection and debugging

## Production Readiness Checklist

### **Infrastructure**
- ✅ Multi-container Docker deployment
- ✅ Persistent volumes for data and uploads
- ✅ Proper networking between containers and host
- ✅ Environment variable management

### **Performance**
- ✅ Chunked response processing for large tools
- ✅ Redis caching for MCP server status
- ✅ Optimized Docker builds and contexts
- ✅ Token-aware response management

### **Reliability**
- ✅ Comprehensive error handling and recovery
- ✅ MCP protocol compliance with proper handshake
- ✅ Graceful degradation when tools fail
- ✅ Health monitoring and status reporting

### **Security**
- ✅ Environment variable isolation
- ✅ Container network segmentation
- ✅ No hardcoded secrets or credentials
- ✅ Proper file permissions and access controls