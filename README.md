# Piper

**Piper** is an advanced AI chat interface with powerful @mention capabilities, comprehensive tool integration, and enterprise-grade monitoring. Designed for both individual and team use, Piper combines the flexibility of modern AI with robust system management features.

![Piper Dashboard](/assets/mcp-dashboard.png)

## Key Features

### 🎯 **Intelligent @mention System**
- **@agents** - Seamlessly switch between specialized AI agents with different capabilities and knowledge domains
- **@tools** - Directly execute MCP tools with parameter support (e.g., `@searx({"query":"latest news"})`)
- **@rules** - Inject context-aware rules and templates into conversations (e.g., `@coding-standards`)
- **Smart Detection** - Intelligent fuzzy matching automatically suggests relevant mentions
- **Unified Interface** - Single `@` trigger provides access to all enhancement types

### 🛠️ **Tool & Agent Management**
- **Visual Tool Explorer** - Browse and attach MCP tools with interactive parameter configuration
- **Agent Orchestration** - Create and manage AI agents with specialized roles and capabilities
- **Tool Discovery** - Hover cards display detailed tool documentation and usage examples
- **Parameter Validation** - Real-time validation for tool parameters with helpful error messages
- **Tool Chaining** - Combine multiple tools in sequence for complex workflows

![Tool Management](/assets/mcp-tools.png)

### 📊 **Comprehensive Monitoring**
- **Real-time Metrics** - Monitor system health with detailed CPU, memory, and disk usage
- **Performance Analytics** - Track response times, token usage, and system performance
- **Alert System** - Configure custom alerts for system events and performance thresholds
- **Resource Utilization** - Visualize resource allocation and identify bottlenecks

![Metrics Dashboard](/assets/mcp-metrics.png)

### 🔌 **MCP Server Management**
- **Centralized Control** - Manage all MCP servers from a single dashboard
- **Server Health** - Real-time monitoring of server status and resource usage
- **Protocol Support** - Compatible with both STDIO and SSE/HTTP MCP server protocols
- **Hot Reloading** - Apply configuration changes without server restarts
- **Connection Management** - Easily connect/disconnect from MCP servers

![MCP Server Management](/assets/edit-mcp.png)

### 📋 **Rules & Templates**
- **Rule Editor** - Create and edit rules with syntax highlighting and preview
- **Template Library** - Organize and categorize reusable prompt templates
- **Bulk Operations** - Apply multiple rules simultaneously

![Rules Management](/assets/rules.png)

### 💻 **Enhanced User Experience**
- **Multi-model Support** - Seamlessly switch between OpenAI, Mistral, Claude, and other models
- **Theme Customization** - Choose from light, dark, or system theme with persistent settings
- **Responsive Layout** - Optimized for desktop and tablet with collapsible sidebars
- **Code Handling** - Syntax highlighting, formatting, and execution for multiple languages
- **File Management** - Upload, preview, and process various document formats
- **Keyboard Shortcuts** - Speed up your workflow with customizable hotkeys

![Code Block Handling](/assets/codeblock.png)

### 📜 **Logging & Auditing**
- **Structured Logging** - Winston-based logging with multiple log levels
- **Advanced Filtering** - Filter logs by date, level, source, and custom tags
- **Real-time Updates** - Stream logs as they're generated
- **Audit Trails** - Track all system changes and user actions
- **Error Analysis** - Automatic error grouping and correlation

![Logs Interface](/assets/logs.png)

## Architecture Highlights

- **Next.js App Router**: Modern React architecture with Server/Client component boundaries
- **Docker Containerized**: Consistent development and deployment environment
- **PostgreSQL + Prisma**: Robust database with type-safe ORM
- **Redis Caching**: High-performance caching for MCP server status
- **TypeScript**: Full type safety with zero linter errors maintained
- **Streaming Architecture**: Real-time AI response streaming for optimal UX

## Installation

### Full Feature Installation (Recommended)
For complete functionality including @mention system, MCP management, and rules:

```bash
git clone https://github.com/jmagar/piper.git
cd piper
./dev.sh  # Starts containerized environment with database
```

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

## Acknowledgments

Piper is built upon and inspired by the work done in the [Zola](https://github.com/ibelick/zola) project. We extend our gratitude to the original authors and contributors for their valuable work.

## License

Apache License 2.0
