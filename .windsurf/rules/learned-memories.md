---
trigger: model_decision
description: 
globs: 
---
# Project Memory

This file stores project-specific knowledge, conventions, and user preferences learned by the AI assistant.

## Docker Configuration Patterns

### Inter-Service Communication
- **Pattern**: Use Docker service names for container-to-container communication, not `localhost`
- **Example**: Redis connection should use `redis://piper-cache:6379` not `redis://localhost:6379`
- **Reason**: In Docker, `localhost` refers to the container itself, not other services
- **Application**: This pattern applies to all inter-container connections (database, cache, etc.)

### Unraid Docker Networking (CRITICAL)
- **Environment**: User is running on Unraid host system
- **Pattern**: For Docker container → Unraid host communication, use Unraid host IP, NOT `localhost`
- **Host IP**: `10.1.0.2` (determined via `hostname -I | awk '{print $1}'`)
- **Example**: MCP servers running on Unraid host should use `http://10.1.0.2:9156/mcp` not `http://localhost:9156/mcp`
- **Reason**: `localhost` inside Docker container refers to container, not Unraid host
- **Result**: All 10 Unraid-hosted MCP servers successfully connecting

### Environment Variable Overrides
- **Pattern**: Override connection URLs in docker-compose.yml environment section
- **Example**: `REDIS_URL=redis://piper-cache:6379` overrides default localhost connection
- **Application**: Database and cache connections require service names in Docker context

### Python MCP Server Support
- **Requirement**: Python-based MCP servers need `uvx` (from `uv` package)
- **Installation**: `curl -LsSf https://astral.sh/uv/install.sh | sh`
- **Critical**: Move binaries to proper PATH: `mv /usr/local/uv* /usr/local/bin/`
- **Verification**: Test with `docker exec container uvx --help`
- **Result**: Enables Python MCP servers (fetch, searxng, github-chat)

## User Preferences

### Deployment Environment
- **Platform**: Unraid server system
- **Containerization**: Docker Compose for all services
- **Networking**: Host IP `10.1.0.2` for container-to-host communication
- **Storage**: Persistent volumes for database and cache

### MCP Server Configuration
- **Total Servers**: 19 MCP servers successfully configured
- **Types**: Unraid-hosted (10), Python-based (3), Node.js (5), External (1)
- **Tools Available**: 128+ total tools across all servers
- **Management**: Centralized via MCP Manager with Redis caching

## Technical Decisions

### Docker Service Architecture
- **piper-app**: Main application on port 8630
- **piper-db**: PostgreSQL database on port 8631
- **piper-cache**: Redis cache on port 8632
- **Networking**: All services communicate using service names within Docker network

### Build Process Requirements
- **Prisma**: Must run `npx prisma generate` before `npm run build` in Dockerfile
- **TypeScript**: Strict mode requires explicit typing for all parameters
- **Dependencies**: Clean `npm ci` installation prevents conflicts with local `node_modules`

### Build Configuration
- **TypeScript**: Strict type checking enabled, all compilation errors resolved
- **Prisma**: Generate client during Docker build process
- **Context**: Optimized `.dockerignore` reduces build context from 860MB to ~17KB

### Error Resolution Patterns
- **Redis Auth Issues**: Reset volume with `docker volume rm piper_piper-cache`
- **TypeScript Errors**: Remove unused props, add explicit typing for parameters
- **Path Issues**: Ensure binaries are in `/usr/local/bin/` for PATH accessibility

## Project Conventions

### Docker Development Workflow
1. Build with comprehensive `.dockerignore`
2. Test container access with `docker exec container command`
3. Use service names for inter-container communication
4. Use host IP for container-to-host communication on Unraid
5. Reset volumes when persistent state issues arise

### Configuration Management
- **File**: `config.json` mounted directly into container
- **Pattern**: Update host URLs to use Unraid IP (`10.1.0.2`)
- **Disabled Servers**: Use `"disabled": true` for problematic MCP servers
- **Environment Variables**: Centralized in docker-compose.yml environment section
