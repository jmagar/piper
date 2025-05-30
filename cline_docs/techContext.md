# Technical Context: Piper AI Chat Application

**Last Updated**: 2025-05-30T00:39:11-04:00

This document outlines the core technologies, development setup, and technical constraints of the Piper project.

## 1. Core Technologies

*   **Runtime Environment**: Node.js (version 18+ recommended)
*   **Programming Language**: TypeScript (version 5.x)
*   **Web Framework**: Next.js (version 14 with App Router)
*   **Database**: PostgreSQL (version 15+)
*   **ORM**: Prisma
*   **Caching**: Redis (version 7+)
*   **Redis Client**: `ioredis`
*   **Containerization**: Docker (with multi-stage builds for production)
*   **AI/LLM SDK**: Vercel AI SDK (version 3.x)
*   **LLM Providers**: Primarily OpenRouter, enabling access to models like Anthropic Claude (Opus, Sonnet, Haiku) and OpenAI GPT series.
*   **Model Context Protocol (MCP) Core Library**: `@model-context/node` (specifically `experimental_createMCPClient` for client creation and utilities for SSE tool loading like `loadMCPToolsFromURL` which is used by a custom wrapper in `lib/mcp/load-mcp-from-url.ts`).
*   **MCP Specification Compliance**: Adheres to MCP 2024-11-05 specification.
*   **Package Management (Node.js)**: `npm` or `yarn` (project uses `package-lock.json`, suggesting `npm`).
*   **Package Management (Python MCPs)**: `uv` is the preferred package manager for Python-based MCP servers if they are managed by Piper's environment.

## 2. Development Setup

*   **Local Environment**: Typically run via `docker compose up --build` which starts the Piper application, PostgreSQL, and Redis containers.
*   **Configuration**: Key configurations are managed in:
    *   `config.json`: Defines MCP server connections and settings.
    *   `.env`: Stores API keys, database URLs, and other secrets/environment-specific variables.
*   **Hot Module Replacement (HMR)**: Next.js HMR is active in development. State persistence for `MCPManager` across HMR is handled by storing instances on `globalThis`.
*   **Logging**: Comprehensive logging is implemented throughout the MCP client and manager to aid in debugging.
*   **VS Code**: Suggested editor with extensions for TypeScript, Docker, Prisma, etc.

## 3. Build & Deployment Process

*   **Docker Images**: Multi-stage `Dockerfile` to create optimized production images.
*   **Deployment Target**: Primarily Unraid, but adaptable to other Docker-supporting environments.
*   **`docker-compose.yml`**: Orchestrates the deployment of Piper and its dependent services (DB, Cache).

## 4. Key Technical Decisions & Solutions

*   **Unified MCP Tool Handling**: A significant effort was made to create a unified system in `MCPManager` (`getCombinedMCPToolsForAISDK`) to process both STDIO and SSE based MCP tools and prepare them for the Vercel AI SDK.
*   **SSE Tool Loading Fix**: Resolved a critical bug where 107 SSE tools were not loading due to `MCPManager` not correctly forming the `transport` object for legacy SSE configurations. The fix involved ensuring the `transport` object is always correctly populated before calling `loadMCPToolsFromURL`.
*   **`loadMCPToolsFromURL` for SSE**: This function (custom or from `@model-context/node`) is key for SSE tools, as it returns AI SDK-compatible tool objects that manage their own invocation, simplifying integration.
*   **Manual Wrapping for STDIO Tools**: STDIO tools require manual wrapping with an `execute` function within `getCombinedMCPToolsForAISDK` to bridge them to the AI SDK's expected interface.

## 5. Technical Constraints & Known Issues (Previously)

*   **~~SSE Tool Invocation (RESOLVED)~~**: 
    *   ~~Previously, there were significant issues with invoking tools on SSE-based MCP servers, including `405 Method Not Allowed` errors when attempting manual POST requests.~~
    *   ~~The root cause of tools not being available was identified in `getCombinedMCPToolsForAISDK`'s handling of SSE configurations.~~
    *   **This entire class of issues is now marked as RESOLVED.** All 107 SSE tools are loading and are invokable via the Vercel AI SDK.
*   **Configuration Sensitivity**: The system relies heavily on the correct structure of `config.json`. Malformed entries, especially for MCP servers, can lead to initialization failures or tools not loading. (Ongoing consideration for more robust validation).

## 6. Current Operational Notes

*   The system is currently stable with all 19+ MCP servers and 128+ tools (including all STDIO and SSE tools) initializing and operating correctly.
*   The Unraid host IP (`10.1.0.2` or as configured) is critical for container-to-host communication for SSE MCPs running directly on the Unraid host.
*   Python-based MCP servers are generally expected to be managed using `uv` if their dependencies are handled by the Piper setup.