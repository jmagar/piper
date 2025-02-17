# LangChain MCP Tools

A TypeScript package that simplifies the use of Model Context Protocol (MCP) server tools with LangChain.

## Overview

This package provides utility functions to convert MCP server tools into LangChain-compatible tools. It handles parallel initialization of multiple MCP servers and converts their available tools into an array of LangChain-compatible tools.

## Key Features

- Converts MCP server tools to LangChain tools
- Handles parallel server initialization
- Supports 450+ functional components available as MCP servers
- Compatible with Node.js 16+

## Installation

```bash
npm i @h1deya/langchain-mcp-tools
```

## Usage Example

```typescript
const mcpServers: McpServersConfig = {
  filesystem: {
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem', '.']
  },
  fetch: {
    command: 'uvx',
    args: ['mcp-server-fetch']
  }
};

const { tools, cleanup } = await convertMcpToLangchainTools(mcpServers);
```

[Source](https://www.npmjs.com/package/@h1deya/langchain-mcp-tools)