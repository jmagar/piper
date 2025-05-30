# Product Context: Piper AI Chat Application

**Last Updated**: 2025-05-30T00:39:11-04:00

## 1. Why Piper Exists

Piper is an AI-powered chat application designed to provide intelligent, conversational access to a wide array of external tools, services, and information sources. It aims to streamline complex workflows, automate tasks, and offer a unified interface for interacting with diverse systems through the power of Large Language Models (LLMs) and the Model Context Protocol (MCP).

The core motivation behind Piper is to bridge the gap between human language and machine interfaces, allowing users to leverage powerful digital tools without needing to understand their specific APIs or command structures. Piper acts as an intelligent intermediary, understanding user intent and orchestrating tool usage to achieve desired outcomes.

## 2. What Problems Piper Solves

Piper addresses several key challenges:

*   **Tool Integration Complexity**: Modern digital environments involve a multitude of specialized tools and services. Piper simplifies this by integrating these tools under a single, conversational AI interface, abstracting away the need for users to learn and manage each tool individually.
*   **Information Overload & Accessibility**: Piper provides a way to query and interact with large volumes of data from various sources (e.g., system logs, documentation, web content, personal media libraries) in a natural and efficient manner.
*   **Workflow Automation**: Repetitive or multi-step tasks involving different services can be automated through Piper's ability to understand complex requests and chain tool invocations.
*   **Bridging Legacy and Modern Systems**: Piper can provide a modern, AI-driven interface to systems that might otherwise be difficult to access or integrate.
*   **Enhanced Productivity**: By making tools and information more readily accessible and actionable through conversation, Piper aims to significantly boost user productivity and efficiency.
*   **Unified Control Plane**: For users managing multiple services (e.g., home servers, media libraries, cloud resources), Piper offers a centralized point of control and interaction.

**Previously, a significant challenge was ensuring reliable access to all configured MCP tools, especially those communicating over Server-Sent Events (SSE). This issue has now been resolved, allowing Piper to fully leverage its extensive toolset.**

## 3. How Piper Should Work (Core Functionality)

Piper operates as a sophisticated chat application with the following key characteristics:

*   **Natural Language Understanding**: Users interact with Piper by typing natural language queries or commands.
*   **Intent Recognition & Tool Selection**: Piper's underlying LLM, guided by the MCP framework, identifies the user's intent and selects the appropriate tool(s) from its registered MCP services to fulfill the request.
*   **MCP Integration**: Piper seamlessly communicates with a diverse ecosystem of MCP servers (currently 19+ active servers providing 128+ tools). This includes:
    *   **STDIO-based MCP servers**: For local or command-line tools, managed via direct process communication.
    *   **SSE-based MCP servers**: For remote or web-accessible tools, managed via HTTP Server-Sent Events. **Tool discovery and invocation for SSE servers are now fully functional.**
*   **Tool Invocation & Response Handling**: Piper invokes the selected tools, passes necessary arguments, and receives their output. It is capable of handling various response types, including large text, structured data, and binary content (though typically summarized or processed).
*   **Advanced Response Processing**: For large tool outputs (>5KB), Piper employs automatic chunking and tool-specific processors (e.g., for HTML, search results) to present information concisely and manage token limits effectively.
*   **Contextual Conversations**: Piper maintains conversation context (leveraging Vercel AI SDK) to handle follow-up questions and multi-turn interactions.
*   **Streaming Responses**: Provides real-time, streaming output to the user for a more interactive experience.
*   **Error Handling & Resilience**: Implements robust error handling for tool invocations and MCP communication, with mechanisms for retries and graceful degradation.
*   **Caching**: Utilizes Redis for caching MCP server status and potentially other data to improve performance and reduce redundant operations.
*   **Secure and Configurable**: Manages sensitive information like API keys through environment variables and allows for flexible configuration of MCP servers via `config.json`.
*   **Production-Ready Deployment**: Designed for stable operation in a production environment, containerized with Docker, and deployable on platforms like Unraid.

Users should experience Piper as a knowledgeable and capable assistant that can understand their needs and efficiently use a wide range of digital tools on their behalf.