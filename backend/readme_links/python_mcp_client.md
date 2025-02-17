# MCP Client Using LangChain (Python Version)

A Python implementation of the Model Context Protocol (MCP) client that demonstrates the use of MCP server tools with LangChain ReAct Agent.

## Features

- Uses `convert_mcp_to_langchain_tools()` from `langchain_mcp_tools`
- Supports LLMs from Anthropic, OpenAI, and Groq
- Handles parallel initialization of MCP servers
- Converts MCP tools to LangChain-compatible tools

## Prerequisites

- Python 3.11+
- `uv` (optional) for Python package-based MCP servers
- npm 7+ (optional) for Node.js package-based MCP servers
- API keys from supported LLM providers

## Configuration

- Uses JSON5 format for configuration
- Supports environment variable substitution
- Follows snake_case convention
- Configurable example queries

[Source](https://github.com/hideya/mcp-client-langchain-py)