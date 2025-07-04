# Piper

<div align="center">
  <p>
    <strong>Piper</strong> is a web-based Model Context Protocol (MCP) client that brings powerful AI tooling to your browser. With full MCP support, Piper enables you to access and manage all your AI tools and agents from anywhere, without needing an IDE or desktop application.
  </p>
  
  [![Piper Dashboard](/assets/mcp-dashboard.png)](#)
  
  [![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
  [![GitHub Stars](https://img.shields.io/github/stars/jmagar/piper?style=social)](https://github.com/jmagar/piper)
</div>

## 📋 Table of Contents

- [✨ Key Features](#-key-features)
- [🚀 Quick Start](#-quick-start)
- [🔧 Installation](#-installation)
- [⚙️ Configuration](#%EF%B8%8F-configuration)
- [🔒 Security](#-security)
- [🏗️ Architecture](#%EF%B8%8F-architecture)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

## ✨ Key Features

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

### 📊 Comprehensive Monitoring

<div align="center">
  <img src="/assets/mcp-metrics.png" alt="Metrics Dashboard" width="80%">
</div>

- **Real-time Metrics**  
  Monitor system health with detailed CPU, memory, and disk usage
  
- **Performance Analytics**  
  Track response times, token usage, and system performance
  
- **Alert System**  
  Configure custom alerts for system events and thresholds
  
- **Resource Utilization**  
  Visualize resource allocation and identify bottlenecks

---

## 🚀 Quick Start

Get up and running with Piper in minutes:

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/)
- [Node.js](https://nodejs.org/) 18+ (for development)

### Clone and Run

```bash
   git clone https://github.com/yourusername/piper.git
   cd piper
   cp .env.example .env
   docker-compose up -d
   ```
   Visit `http://localhost:8630` in your browser
---

## 🔧 Installation

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/)
- [Node.js](https://nodejs.org/) 18+ (for development)

### Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/piper.git
   cd piper
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. Start the development environment:
   ```bash
   ./scripts/dev.sh up
   ```

4. Access the application at `http://localhost:3000`

---

## ⚙️ Configuration

Piper can be configured using environment variables. Copy `.env.example` to `.env` and modify as needed:

```env
# Application
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://piper:piper@piper-db:5432/piper

# Redis
REDIS_URL=redis://piper-cache:6379
```

### Cache Management

Piper uses Redis for high-performance caching of configurations and token counting. The cache automatically invalidates when config files change, but manual management is also available:

```bash
# View cache statistics
./scripts/clear-cache.sh --stats

# Clear all caches
./scripts/clear-cache.sh

# Clear only config cache (useful for config troubleshooting)
./scripts/clear-cache.sh --config-only

# See what would be cleared without doing it
./scripts/clear-cache.sh --dry-run --verbose
```

For detailed cache management documentation, see [docs/cache-management.md](docs/cache-management.md).

---

<div align="center">
  Made with ❤️ by the Piper Team
</div>

## 🖥️ MCP Server Management

<div align="center">
  <img src="/assets/edit-mcp.png" alt="MCP Server Management" width="80%">
</div>

- **Centralized Control**  
  Manage all MCP servers from a single dashboard
  
- **Server Health**  
  Real-time monitoring of server status and resource usage
  
- **Protocol Support**  
  Compatible with both STDIO and SSE/HTTP MCP server protocols
  
- **Hot Reloading**  
  Apply configuration changes without server restarts
  
- **Connection Management**  
  Easily connect/disconnect from MCP servers

## 🛡️ Agent Capabilities

| Capability | Description |
|------------|-------------|
| **@agent Switching** | Instantly switch between specialized AI agents |
| **Tool Integration** | Direct MCP tool execution with parameter input |
| **Rule Enhancement** | Context injection for improved AI responses |
| **Multi-modal Support** | Work with text, code, and document processing |
| **Extensible Architecture** | Add custom tools and agents easily |

## 📋 Rules & Templates

<div align="center">
  <img src="/assets/rules.png" alt="Rules Management" width="80%">
</div>

- **Rule Editor**  
  Create and edit rules with syntax highlighting and preview
  
- **Template Library**  
  Organize and categorize reusable prompt templates
  
- **Bulk Operations**  
  Apply multiple rules simultaneously

## 💻 Enhanced User Experience

<div align="center">
  <img src="/assets/codeblock.png" alt="Code Block Handling" width="80%">
</div>

- **Multi-model Support**  
  Seamlessly switch between AI providers (OpenAI, Mistral, Claude, etc.)
  
- **Theme Customization**  
  Light, dark, or system theme with persistent settings
  
- **Responsive Layout**  
  Optimized for desktop and tablet with collapsible sidebars
  
- **Code Handling**  
  Syntax highlighting, formatting, and execution for multiple languages
  
- **File Management**  
  Upload, preview, and process various document formats
  
- **Keyboard Shortcuts**  
  Speed up your workflow with customizable hotkeys

## 📜 Logging & Auditing

<div align="center">
  <img src="/assets/logs.png" alt="Logs Interface" width="80%">
</div>

- **Structured Logging**  
  Winston-based logging with multiple log levels
  
- **Advanced Filtering**  
  Filter logs by date, level, source, and custom tags
  
- **Real-time Updates**  
  Stream logs as they're generated
  
- **Audit Trails**  
  Track all system changes and user actions
  
- **Error Analysis**  
  Automatic error grouping and correlation

## 🏗️ Architecture

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; margin: 1.5rem 0;">
  <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px; border-left: 4px solid #4e44ce;">
    <h4>Next.js App Router</h4>
    <p>Modern React architecture with Server/Client component boundaries</p>
  </div>
  <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px; border-left: 4px solid #4e44ce;">
    <h4>Docker Containerized</h4>
    <p>Consistent development and deployment environment</p>
  </div>
  <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px; border-left: 4px solid #4e44ce;">
    <h4>PostgreSQL + Prisma</h4>
    <p>Robust database with type-safe ORM</p>
  </div>
  <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px; border-left: 4px solid #4e44ce;">
    <h4>Redis Caching</h4>
    <p>High-performance caching for MCP server status</p>
  </div>
  <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px; border-left: 4px solid #4e44ce;">
    <h4>TypeScript</h4>
    <p>Full type safety with zero linter errors</p>
  </div>
  <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px; border-left: 4px solid #4e44ce;">
    <h4>Progressive Web App</h4>
    <p>Offline capabilities and installable on devices</p>
  </div>
</div>

## 🔒 Security

⚠️ **Important Security Notice**

Piper does not include built-in user authentication. By default, anyone with access to the application will have full access to all features and data.

**DO NOT expose Piper directly to the internet without proper security measures in place.**

### Recommended Security Measures:

1. **Reverse Proxy with Authentication**
   - Use a reverse proxy like Nginx or Traefik with authentication
   - Enable HTTPS with valid certificates (e.g., Let's Encrypt)
   - Implement IP whitelisting if applicable

2. **Network-Level Protection**
   - Run Piper behind a VPN
   - Use firewall rules to restrict access to trusted IPs only
   - Consider using a service like Cloudflare Access

3. **Docker Security**
   - Run containers with non-root users
   - Keep containers updated
   - Use Docker secrets for sensitive data

## 🛠️ Built with

- [Next.js](https://nextjs.org/) — Full-stack React framework with PWA support
- [Serwist](https://serwist.pages.dev/) — PWA and service worker management
- [shadcn/ui](https://ui.shadcn.com) — Core components
- [motion-primitives](https://motion-primitives.com) — Animated components
- [Vercel AI SDK](https://vercel.com/blog/introducing-the-vercel-ai-sdk) — Model integration and streaming
- [Prisma](https://www.prisma.io/) — Type-safe database ORM
- [Docker](https://www.docker.com/) — Containerization and development environment
- [Winston](https://github.com/winstonjs/winston) — Enterprise logging
- [Tailwind CSS](https://tailwindcss.com/) — Styling framework
- [TypeScript](https://www.typescriptlang.org/) — Type-safe JavaScript

## 🌐 API Reference

### Core Endpoints
- `/api/chat` — AI chat with streaming support
- `/api/rules-available` — Database rules for @mention
- `/api/mcp-tools-available` — Available MCP tools
- `/api/mcp-servers` — Server status and management
- `/api/logs` — System logs and monitoring
- `/api/chat/history` — Chat history management
- `/api/chat/feedback` — User feedback submission

### MCP Endpoints
- `/api/mcp/execute` — Execute MCP tools
- `/api/mcp/status` — MCP server status
- `/api/mcp/config` — MCP server configuration

## 📁 Project Structure

```
piper/
├── app/                  # Next.js app directory
├── components/           # Reusable UI components
├── lib/                  # Core functionality
│   ├── mcp/             # MCP client and tooling
│   ├── agents/          # Agent implementations
│   └── utils/           # Utility functions
├── prisma/              # Database schema and migrations
├── public/              # Static assets
└── scripts/             # Development and build scripts
```

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Organization

1. **Core Logic**: Main application logic in `app/` and `lib/`
2. **UI Components**: Reusable components in `components/`
3. **MCP Integration**: Tool integrations in `lib/mcp/`
4. **Logging System**: Comprehensive logging in `lib/logger/`

## 🙏 Acknowledgments

Piper is built upon and inspired by the work done in the [Zola](https://github.com/ibelick/zola) project. We extend our gratitude to the original authors and contributors for their valuable work.

## 📄 License

Apache License 2.0
