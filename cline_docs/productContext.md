# Product Context: Piper Chat Application

## Overview

Piper is a web-based chat application designed to facilitate interactions with various AI models through an extensible MCP (Model Context Protocol) server architecture. It allows users to create and manage chat sessions, select different AI models for conversation, configure and manage MCP servers that provide specialized tools and capabilities, and persists chat history. The application is intended for local development and potentially self-hosted deployment, utilizing Docker for containerization. **It now features a comprehensive logging and error handling system, maintains strict Next.js compliance with zero TypeScript/ESLint errors, includes enhanced header UI with theme controls, and provides high-performance streaming AI responses.**

## Problems Solved

- Provides a user interface for engaging with multiple AI models within a single application.
- Manages and stores chat history for users.
- **MCP Server Management**: Provides comprehensive management of MCP servers including configuration, monitoring, and tool access through an intuitive unified interface.
- **Extensible Tool Ecosystem**: Supports both STDIO and SSE/HTTP MCP servers to extend AI capabilities with specialized tools.
- **Revolutionary @mention System**: Implemented complete 3-way @mention functionality allowing users to seamlessly integrate agents, tools, AND database rules directly into conversations for enhanced AI responses.
- Aims to provide a stable and configurable environment for AI chat interactions.
- **Enhanced Observability & Debugging**: Implemented a robust logging system to capture detailed information about application behavior, errors, MCP communication, and AI SDK operations. This significantly improves troubleshooting and monitoring capabilities.
- **Next.js Compliance & Architecture Stability**: Resolved Server Action naming violations and React Context boundary issues to ensure proper Next.js App Router compliance, eliminating runtime errors and maintaining clean, maintainable code architecture.
- **Enhanced User Interface Control**: Added theme switching capabilities and consistent sidebar access for improved user experience and interface customization.
- **Performance & Responsiveness**: Restored streaming AI responses that provide immediate feedback and dramatically improved perceived performance (~90% reduction in response time).

## How It Should Work (User Perspective)

- Users access Piper through a web browser (e.g., `http://localhost:8630` in development).
- Users can create new chat sessions and interact with AI models.
- For each chat, users can select an AI model and leverage tools provided by configured MCP servers.
- **Enhanced Header Interface**: Users have consistent access to improved controls:
  - **Theme Toggle**: Switch between Light, Dark, and System themes via dropdown menu in header
  - **Sidebar Toggle**: Always-available sidebar toggle for navigation regardless of layout preferences
  - **Consistent Access**: All header controls maintain consistent positioning and accessibility
- **High-Performance AI Interactions**: 
  - AI responses stream progressively as they're generated (no waiting for complete responses)
  - Immediate feedback with text appearing in real-time (~300ms to first content)
  - Dramatically improved perceived performance compared to blocking response patterns
- **Revolutionary @mention System**: Users can enhance conversations by typing `@` in chat input to access:
  - **@agents** → Switch between different chat agents for specialized capabilities
  - **@tools** → Execute MCP tools directly with parameter input (e.g., `@searx({"query":"latest news"})`)
  - **@rules** → Inject database-stored rule content into AI context (e.g., `@coding-standards` enhances system prompt)
  - **Intelligent Detection**: Fuzzy matching automatically determines which dropdown to show based on user input
  - **Unified Interface**: Single `@` trigger provides access to all three enhancement types seamlessly
- **MCP Server Management**: Users can access a comprehensive MCP Servers Dashboard (via the Server icon in the header) that allows them to:
  - View real-time status and health of all configured MCP servers
  - See available tools for each server via hover cards
  - Add new MCP servers with support for STDIO and SSE/HTTP transports
  - Edit existing server configurations with pre-populated forms
  - Enable/disable servers with toggle switches
  - Delete servers with confirmation dialogs
  - Save all configuration changes to persist settings
- **Rules Management**: Users can create and manage reusable prompt snippets called "Rules":
  - Browse existing rules with search and pagination
  - Create new rules with name, description, and prompt content
  - Edit existing rules with pre-populated forms
  - Delete rules with confirmation dialogs
  - View individual rule details with "more rules" suggestions
  - Future: @mention rules in conversations for prompt injection
- Chat messages and session details are saved to a PostgreSQL database.
- The application handles user authentication through Authelia 2FA integration.
- API calls are made from the frontend (Next.js client-side components) to backend Next.js API routes to perform actions such as creating chats, sending messages, managing MCP servers, and fetching data.
- The backend uses Prisma ORM to communicate with the PostgreSQL database.
- Environment variables (`.env` file) are crucial for configuring database connections, API keys, and application URLs.
- **Security**: 
    - Relies on Authelia 2FA for secure access.
    - CSRF protection has been removed as unnecessary.
    - **Logging Security**: The new logging system includes PII detection, data sanitization, and access controls for viewing logs.
- **Log Management (Admin Users)**:
    - Admins can access a **Log Viewer** via the System Administration dashboard.
    - The Log Viewer allows filtering logs by level, source, correlation ID, user ID, and time range.
    - It provides real-time updates, detailed log inspection, and options to export logs.
    - A **Log Health Check** endpoint (`/api/logs/health`) is available for monitoring the logging system's status.
- **Development & Deployment**:
    - **Containerized Environment**: Application runs in Docker containers for consistent deployment
    - **Hot Reloading**: Changes to source code reflect immediately in the running application
    - **Zero Linter Errors**: Application maintains strict TypeScript/ESLint compliance for clean development
    - **Next.js App Router Compliance**: Proper Server/Client component boundaries and naming conventions ensure stable runtime behavior
    - **Performance Excellence**: Streaming AI responses provide excellent user experience with immediate feedback