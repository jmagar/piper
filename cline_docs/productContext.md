# Product Context: Piper - Your Agentic AI Coding Assistant

## Vision & Mission

Piper aims to be an indispensable AI pair programmer, seamlessly integrating with a developer's workflow to enhance productivity, creativity, and code quality. It strives to understand context, automate tasks, and provide intelligent assistance through natural language interaction and powerful tool usage.

## Core Features & Capabilities

### **1. Conversational AI Interface**
- **Natural Language Understanding**: Powered by various LLMs (OpenAI, Anthropic, Google, etc.)
- **Multi-Turn Dialog**: Maintains context for coherent conversations
- **Streaming Responses**: Real-time feedback and answers

### **2. MCP Tool Integration & Execution**
- **Comprehensive Toolset**: Connects to 19 MCP servers providing 130+ tools
  - **SSE Tools (107)**: Media management, system administration, notifications, network control
  - **STDIO Tools (23)**: File system operations, web fetching, code search, development tools
- **Dual Transport Support**: Seamlessly integrates both SSE and STDIO MCP servers
- **Dynamic Tool Discovery**: Automatically registers tools from connected MCP servers
- **Intelligent Tool Selection**: LLM decides which tool to use based on user intent
- **Robust Error Handling**: Graceful degradation if a tool fails

### **3. Advanced Tool Ecosystem**
- **Media Control**: Plex, Overseerr, Tautulli, SABnzbd, qBittorrent management
- **System Administration**: Unraid server control, Docker container management
- **Network Management**: UniFi controller integration for network operations
- **Content Discovery**: Prowlarr indexer management, web crawling capabilities
- **Communication**: Gotify notifications and alerting systems
- **Development**: GitHub integration, filesystem operations, code analysis
- **Search & Retrieval**: Web search, content fetching, data processing

### **4. Agentic Workflow Automation**
- **Multi-Step Operations**: Can chain multiple tool calls to achieve complex tasks
- **Contextual Awareness**: Leverages chat history and (planned) memory systems
- **Proactive Assistance**: (Future) Suggests relevant tools or actions

### **5. Development Environment Integration**
- **Dockerized Deployment**: Easy setup and consistent operation on Unraid
- **Local File Access**: Securely interacts with the user's file system via MCP
- **Real-time Status Monitoring**: Dashboard for MCP server health across all transports

### **6. User Experience & Interface**
- **Modern UI**: Built with Next.js, React, Tailwind CSS, shadcn/ui
- **Command Menu**: Quick access to tools and commands (cmdk)
- **Clear Feedback**: Visual indication of tool usage, status, and errors
- **Performance Optimized**: Smart content processing for large tool responses

## Target Audience

- **Software Developers**: Primary users, across various domains and skill levels
- **DevOps Engineers**: For automation and infrastructure-related tasks
- **Media Enthusiasts**: For media server management and automation
- **System Administrators**: For server management and monitoring
- **Data Scientists/Analysts**: For data manipulation and analysis (future potential)

## Key Differentiators

- **Comprehensive Tool Ecosystem**: 130+ tools across both SSE and STDIO transports
- **Agentic Capabilities**: Goes beyond simple Q&A to perform complex automation
- **Dual Transport Integration**: Seamlessly supports both local and remote MCP servers
- **Local-First Design**: Operates within the user's environment, enhancing security and context
- **Production-Ready**: Optimized for Unraid deployment with enterprise-level reliability
- **Open & Configurable**: Users can add/modify MCP servers and tools
- **Smart Processing**: Intelligent handling of large tool responses with chunking and optimization

## Technical Achievements

### **Infrastructure Excellence**
- **Docker Deployment**: Optimized containerization with 17KB build context
- **Multi-Container Architecture**: Application, database, and cache coordination
- **Network Optimization**: Proper Unraid host integration with container-to-host communication

### **MCP Integration Innovation**
- **Dual Transport Pattern**: Revolutionary approach supporting both SSE and STDIO
- **Backward Compatibility**: Seamless handling of legacy and new configuration formats
- **Tool Ecosystem**: Most comprehensive MCP tool integration available
- **Performance**: Sub-5-second tool execution with intelligent response processing

## Future Roadmap (High-Level)

- **Enhanced Memory System**: Long-term persistence of user preferences and project context
- **VS Code Extension**: Deeper integration into the IDE
- **Collaborative Features**: Multi-user sessions, shared context
- **Self-Healing & Learning**: Agents that can improve over time
- **Advanced UI/UX**: More sophisticated ways to visualize agent actions and results
- **Expanded Tool Library**: Additional MCP server integrations based on user needs
