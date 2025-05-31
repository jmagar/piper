# Product Context: Piper Chat Application

## Overview

Piper is a web-based chat application designed to facilitate interactions with various AI models through an extensible MCP (Model Context Protocol) server architecture. It allows users to create and manage chat sessions, select different AI models for conversation, configure and manage MCP servers that provide specialized tools and capabilities, and persists chat history. The application is intended for local development and potentially self-hosted deployment, utilizing Docker for containerization.

## Problems Solved

- Provides a user interface for engaging with multiple AI models within a single application.
- Manages and stores chat history for users.
- **MCP Server Management**: Provides comprehensive management of MCP servers including configuration, monitoring, and tool access through an intuitive unified interface.
- **Extensible Tool Ecosystem**: Supports both STDIO and SSE/HTTP MCP servers to extend AI capabilities with specialized tools.
- Aims to provide a stable and configurable environment for AI chat interactions.

## How It Should Work (User Perspective)

- Users access Piper through a web browser (e.g., `http://localhost:8630` in development).
- Users can create new chat sessions and interact with AI models.
- For each chat, users can select an AI model and leverage tools provided by configured MCP servers.
- **MCP Server Management**: Users can access a comprehensive MCP Servers Dashboard (via the Server icon in the header) that allows them to:
  - View real-time status and health of all configured MCP servers
  - See available tools for each server via hover cards
  - Add new MCP servers with support for STDIO and SSE/HTTP transports
  - Edit existing server configurations with pre-populated forms
  - Enable/disable servers with toggle switches
  - Delete servers with confirmation dialogs
  - Save all configuration changes to persist settings
- Chat messages and session details are saved to a PostgreSQL database.
- The application handles user authentication through Authelia 2FA integration.
- API calls are made from the frontend (Next.js client-side components) to backend Next.js API routes to perform actions such as creating chats, sending messages, managing MCP servers, and fetching data.
- The backend uses Prisma ORM to communicate with the PostgreSQL database.
- Environment variables (`.env` file) are crucial for configuring database connections, API keys, and application URLs.
- **Security**: The application relies on Authelia 2FA for secure access, with CSRF protection removed as unnecessary.