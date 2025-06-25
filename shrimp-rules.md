# Piper Development Standards for AI Agents

## Project Overview

**Piper** is an AI chat platform with sophisticated MCP (Model Context Protocol) server integration, agent management, and real-time chat capabilities. Built with Next.js 14+ App Router, TypeScript, Prisma ORM, and custom MCP protocol implementation.

## Architecture Rules

### Framework Standards
- **ALWAYS** use Next.js App Router patterns (never Pages Router)
- **ALWAYS** maintain TypeScript strict mode compliance
- **ALWAYS** use Prisma for database operations (never raw SQL)
- **ALWAYS** implement proper abort signal handling for streaming operations
- **ALWAYS** use modular component architecture with clear separation of concerns

### Directory Structure Rules
- API routes: `/app/api/` - Follow REST conventions
- Components: `/app/components/` - Use kebab-case directories with PascalCase files
- Library modules: `/lib/` - Descriptive directory names with clear separation
- Configuration: Root level - Use specific naming patterns (config.json, schema.prisma)

## Critical Multi-file Coordination

### MCP System Coordination
**WHEN modifying MCP functionality:**
- Update `/lib/mcp/enhanced-integration.ts` AND `/app/api/mcp/config/route.ts`
- Update `/lib/mcp/enhanced/managed-client.ts` AND `/app/api/mcp/status/route.ts`
- Update `/lib/mcp/modules/` files AND corresponding API routes
- Update MCP optimization modules: mention-cache-manager.ts, system-prompt-optimizer.ts, tool-definition-compressor.ts, validation-cache-manager.ts

### Chat System Coordination
**WHEN modifying chat functionality:**
- Update `/lib/chat-store/chats/api.ts` AND `/app/api/chat/route.ts`
- Update `/app/api/chat/lib/chat-orchestration.ts` AND message-processing.ts AND message-pruning.ts AND token-management.ts
- Update chat components AND chat input components simultaneously

### Agent Management Coordination
**WHEN modifying agent functionality:**
- Update `/lib/agents/load-agent.ts` AND `/app/api/agents/` routes
- Update `/app/api/create-agent/` AND agent components
- Update agent store AND agent-related API endpoints

### Database Schema Coordination
**WHEN modifying database:**
- **NEVER** modify `/prisma/schema.prisma` without creating migrations
- **ALWAYS** run `npx prisma migrate dev` after schema changes
- **ALWAYS** update seed.ts if schema affects default data

## MCP System Standards

### Enhanced MCP Integration Rules
- **USE** enhanced MCP client for production operations
- **USE** managed client wrapper for connection lifecycle
- **IMPLEMENT** proper caching for MCP tool definitions
- **IMPLEMENT** system prompt optimization for token efficiency
- **IMPLEMENT** mention cache for frequently accessed tools

### MCP Module Organization
- **Core modules**: `/lib/mcp/enhanced/` - Main integration logic
- **Utility modules**: `/lib/mcp/modules/` - Specialized functionality
- **API endpoints**: `/app/api/mcp/` - External interfaces
- **Cache managers**: Use Redis for persistent caching, memory for session caching

## Chat System Standards

### Message Processing Rules
- **ALWAYS** implement proper token management with pruning
- **ALWAYS** coordinate message processing with orchestration layer
- **ALWAYS** handle abort signals for streaming responses
- **NEVER** bypass message pruning when approaching token limits

### Chat Orchestration Patterns
- **USE** centralized orchestration for all chat operations
- **IMPLEMENT** proper error handling with logging integration
- **MAINTAIN** message history consistency across operations

## Agent Management Standards

### Agent Loading Rules
- **ALWAYS** use `/lib/agents/load-agent.ts` for agent initialization
- **VALIDATE** agent configuration before loading
- **IMPLEMENT** proper error handling for missing or invalid agents
- **COORDINATE** agent creation with database updates

### Agent Configuration
- **STORE** agent configurations in database via Prisma
- **VALIDATE** agent parameters against schema
- **IMPLEMENT** agent versioning for updates

## API Development Standards

### Error Handling Requirements
- **ALWAYS** use centralized error handling from `/middleware/error-handler.ts`
- **NEVER** create API routes without proper error handling
- **IMPLEMENT** structured logging via `/lib/logger/` modules
- **RETURN** consistent error response formats

### Middleware Integration
- **ALWAYS** implement correlation ID tracking
- **ALWAYS** use logging middleware for API routes
- **COORDINATE** with error handler middleware

### Logging Standards
- **USE** centralized logging from `/lib/logger/` modules
- **IMPLEMENT** proper log levels and structured format
- **COORDINATE** AI SDK logging, MCP logging, and error logging
- **NEVER** bypass logging middleware in API routes

## Component Standards

### Component Organization
- **CREATE** reusable components in `/components/ui/`
- **CREATE** feature-specific components in `/app/components/`
- **USE** motion primitives for animations
- **IMPLEMENT** proper TypeScript interfaces for props

### Naming Conventions
- **USE** PascalCase for component files
- **USE** kebab-case for component directories
- **USE** descriptive names that indicate functionality
- **MAINTAIN** consistent naming across related components

## Prohibited Actions

### Critical Prohibitions
- **NEVER** modify Prisma schema without creating migrations
- **NEVER** bypass logging middleware in API routes
- **NEVER** create API routes without proper error handling
- **NEVER** modify MCP integration without updating both lib and API layers
- **NEVER** change chat processing without coordinating token management
- **NEVER** use Pages Router patterns (App Router only)
- **NEVER** implement raw SQL queries (Prisma only)
- **NEVER** modify PWA manifest without updating service worker
- **NEVER** create components without proper TypeScript interfaces

### Development Prohibitions
- **NEVER** commit changes without running lint and typecheck
- **NEVER** deploy without proper error handling
- **NEVER** implement caching without considering invalidation
- **NEVER** modify configuration without updating related systems

## AI Decision-Making Standards

### MCP System Decisions
- **USE** enhanced MCP client for all production operations
- **USE** basic client only for development/testing
- **IMPLEMENT** caching when tools are frequently accessed
- **OPTIMIZE** system prompts when token limits approached

### Component Architecture Decisions
- **CREATE** new components when functionality is distinctly different
- **EXTEND** existing components when adding related features
- **REFACTOR** components when they exceed 200 lines
- **EXTRACT** common logic into custom hooks

### Error Handling Decisions
- **USE** centralized error handling for API routes
- **USE** component-level error boundaries for UI errors
- **LOG** all errors with appropriate context
- **RETURN** user-friendly error messages

### Performance Optimization Decisions
- **IMPLEMENT** caching for expensive operations
- **USE** streaming for long-running operations
- **OPTIMIZE** database queries with proper indexing
- **MINIMIZE** bundle size with proper code splitting

## File Interaction Matrix

### When Modifying MCP Files:
- `/lib/mcp/enhanced-integration.ts` → Update `/app/api/mcp/config/route.ts`
- `/lib/mcp/enhanced/managed-client.ts` → Update `/app/api/mcp/status/route.ts`
- `/lib/mcp/modules/*` → Update corresponding `/app/api/mcp/*` routes

### When Modifying Chat Files:
- `/lib/chat-store/chats/api.ts` → Update `/app/api/chat/route.ts`
- `/app/api/chat/lib/chat-orchestration.ts` → Coordinate with message-processing.ts, message-pruning.ts, token-management.ts

### When Modifying Agent Files:
- `/lib/agents/load-agent.ts` → Update `/app/api/agents/*` routes
- `/app/api/create-agent/*` → Update agent components and store

### When Modifying Database:
- `/prisma/schema.prisma` → Create migration, update seed.ts
- Migration files → Update related API routes and components

## Development Workflow Standards

### Before Making Changes
1. **READ** all related files completely
2. **UNDERSTAND** multi-file dependencies
3. **PLAN** coordination across affected systems
4. **VERIFY** current implementation patterns

### During Development
1. **MAINTAIN** consistent coding standards
2. **IMPLEMENT** proper error handling
3. **ADD** appropriate logging
4. **TEST** functionality across coordinated files

### After Making Changes
1. **RUN** `npm run lint` and fix all issues
2. **RUN** `npm run typecheck` and resolve errors
3. **VERIFY** all coordinated files are updated
4. **TEST** functionality end-to-end

## Quality Assurance Rules

### Code Quality Requirements
- **MAINTAIN** TypeScript strict mode compliance
- **IMPLEMENT** comprehensive error handling
- **USE** consistent naming conventions
- **WRITE** clean, readable code with minimal comments
- **ENSURE** proper separation of concerns

### Testing Requirements
- **TEST** all API endpoints with proper error cases
- **VERIFY** component functionality across different states
- **VALIDATE** database operations with Prisma
- **CONFIRM** MCP integration works with test servers

### Performance Requirements
- **OPTIMIZE** database queries for efficiency
- **IMPLEMENT** appropriate caching strategies
- **MINIMIZE** bundle size and loading times
- **HANDLE** streaming operations properly 