# Product Context: Piper - Your Intelligent Command & Control Center

## Core Mission
Piper aims to be a centralized, AI-augmented interface for managing and interacting with a diverse ecosystem of self-hosted services and development tools, primarily through Model Context Protocol (MCP) servers. It streamlines complex workflows, provides a unified dashboard for system status, and empowers users with AI-driven assistance for tasks ranging from media management to code deployment.

## Problems Solved
- **Fragmentation of Services**: Users often manage multiple self-hosted applications (Plex, SABnzbd, Unraid, etc.) through disparate UIs. Piper offers a single pane of glass.
- **Complex Interactions**: Interacting with some services or performing multi-step operations can be cumbersome. Piper, via AI and MCP, simplifies these.
- **Lack of Unified Overview**: Difficult to get a quick snapshot of the health and status of all connected services.
- **Inefficient Task Execution**: Repetitive tasks or those requiring knowledge of specific APIs/CLIs can be automated or simplified.
- **Bridging AI to Local Tools**: Provides a secure and standardized way for Large Language Models (LLMs) to interact with local system resources and tools.

## How It Should Work (User Perspective)
- **Dashboard**: A clear, customizable dashboard showing the status of connected MCP servers and key metrics from services (e.g., Unraid array status, active downloads).
- **MCP Server Management**: Easy UI to add, configure, enable/disable, and monitor MCP servers. Configuration should be persistent and robust.
- **Tool Interaction**: Users (or an AI agent via Piper) can invoke tools provided by MCP servers to perform actions (e.g., search for media, trigger a download, check system logs).
- **AI Integration**: Seamless integration with an AI model that can understand user requests, select appropriate MCP tools, execute them, and present results.
- **Notifications**: Receive notifications from services (e.g., Gotify) or about Piper events.
- **Secure and Reliable**: Configuration and sensitive data (like API keys for MCP servers) should be handled securely. The application should be stable and recover gracefully from errors.
- **Developer Friendly**: For those extending Piper or adding new MCPs, the process should be straightforward with clear patterns. Hot reloading and efficient development workflows are essential.