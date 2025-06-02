# Piper

[piper.chat](https://piper.chat)

**Piper** is the open-source interface for AI chat with revolutionary @mention capabilities.

[![Chat with this repo](https://piper.chat/button/github.svg)](https://piper.chat/?agent=github/jmagar/piper)

![piper screenshot](./public/cover_piper.webp)

## Revolutionary Features

### 🎯 **3-Way @mention System**
- **@agents** → Switch between specialized chat agents instantly
- **@tools** → Execute MCP tools directly with parameters (e.g., `@searx({"query":"latest news"})`)
- **@rules** → Inject database-stored rules into AI context (e.g., `@coding-standards`)
- **Intelligent Detection**: Fuzzy matching automatically determines which dropdown to show
- **Unified Interface**: Single `@` trigger provides seamless access to all enhancement types

### 🔧 **MCP Server Management**
- **Comprehensive Dashboard**: Real-time server status and health monitoring
- **Full CRUD Operations**: Add, edit, delete, and configure MCP servers
- **Dual Transport Support**: STDIO and SSE/HTTP MCP server protocols
- **Tool Discovery**: Hover cards showing available tools for each server
- **Hot Configuration**: Save changes without server restart

### 📋 **Advanced Rules System**
- **Rule Management**: Create, edit, and organize reusable prompt templates
- **Context Injection**: Rules enhance AI responses through system prompt modification
- **Smart Search**: Find and apply rules quickly with search and pagination
- **Slug-based Access**: Clean `@rule-slug` format for easy mention in conversations

### 🎨 **Enhanced User Experience**
- **Multi-model Support**: OpenAI, Mistral, Claude, Gemini with streaming responses
- **Theme Control**: Light, dark, and system theme switching from header
- **Responsive Design**: Clean UI with consistent sidebar access and navigation
- **Real-time Streaming**: Progressive AI responses (~300ms to first content)
- **File Uploads**: Context-aware document processing and analysis

### 🔍 **Enterprise-Grade Monitoring**
- **Comprehensive Logging**: Winston-based structured logging with file rotation
- **Log Viewer**: Real-time log filtering, search, and export capabilities
- **Health Monitoring**: System health checks and performance metrics
- **Error Handling**: Advanced error classification and retry mechanisms
- **Audit Trail**: Complete request/response logging with correlation IDs

## Architecture Highlights

- **Next.js App Router**: Modern React architecture with Server/Client component boundaries
- **Docker Containerized**: Consistent development and deployment environment
- **PostgreSQL + Prisma**: Robust database with type-safe ORM
- **Redis Caching**: High-performance caching for MCP server status
- **TypeScript**: Full type safety with zero linter errors maintained
- **Streaming Architecture**: Real-time AI response streaming for optimal UX

## Installation

### Quick Start (Basic Features)
```bash
git clone https://github.com/jmagar/piper.git
cd piper
npm install
echo "OPENAI_API_KEY=your-key" > .env.local
npm run dev
```

### Full Feature Installation (Recommended)
For complete functionality including @mention system, MCP management, and rules:

```bash
git clone https://github.com/jmagar/piper.git
cd piper
./dev.sh  # Starts containerized environment with database
```

See [INSTALL.md](./INSTALL.md) for detailed setup instructions including:
- Database configuration
- Authentication setup (Authelia 2FA)
- MCP server configuration
- Environment variables

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/jmagar/piper)

## Agent Capabilities

- **@agent Switching**: Instant agent selection for specialized conversations
- **Tool Integration**: Direct MCP tool execution with parameter input
- **Rule Enhancement**: Context injection for improved AI responses
- **Multi-modal Support**: Text, code, and document processing
- **Extensible Architecture**: Add custom tools and agents easily

## Built with

- [Next.js](https://nextjs.org/) — Full-stack React framework
- [prompt-kit](https://prompt-kit.com/) — AI components
- [shadcn/ui](https://ui.shadcn.com) — Core components
- [motion-primitives](https://motion-primitives.com) — Animated components
- [Vercel AI SDK](https://vercel.com/blog/introducing-the-vercel-ai-sdk) — Model integration and streaming
- [Prisma](https://www.prisma.io/) — Type-safe database ORM
- [Docker](https://www.docker.com/) — Containerization and development environment
- [Winston](https://github.com/winstonjs/winston) — Enterprise logging
- [Tailwind CSS](https://tailwindcss.com/) — Styling framework

## API Reference

### Core Endpoints
- `/api/chat` — AI chat with streaming support
- `/api/rules-available` — Database rules for @mention
- `/api/mcp-tools-available` — Available MCP tools
- `/api/mcp-servers` — Server status and management
- `/api/logs` — System logs and monitoring

### @mention Formats
- **Agents**: `@agent-name` → Switch active agent
- **Tools**: `@tool-name({"param":"value"})` → Execute with parameters
- **Rules**: `@rule-slug` → Inject rule content into context

## Contributing

Piper is built with a modular architecture that makes it easy to contribute:

1. **Frontend Components**: React components in `app/components/`
2. **API Routes**: Next.js API routes in `app/api/`
3. **Database Schema**: Prisma schema in `prisma/schema.prisma`
4. **MCP Integration**: Tool integrations in `lib/mcp/`
5. **Logging System**: Comprehensive logging in `lib/logger/`

## Sponsors

<a href="https://vercel.com/oss">
  <img alt="Vercel OSS Program" src="https://vercel.com/oss/program-badge.svg" />
</a>

## License

Apache License 2.0

## Status

**Production Ready** — Piper features a robust, tested architecture with comprehensive error handling, logging, and monitoring. The @mention system and MCP integration provide a powerful foundation for AI-enhanced workflows.
