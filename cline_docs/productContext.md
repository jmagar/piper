# Product Context: Piper Chat Application

**Last Updated**: Current Session (File Mention Integration)

## Core Vision
Piper is an advanced, context-aware AI chat application designed to streamline developer workflows and enhance productivity. It integrates with various tools and services, providing a unified interface for coding assistance, system management, and information retrieval.

## Key Features & Functionality

### 1. **Conversational AI Core**
- **Multi-model support**: Seamlessly switch between different large language models (LLMs) like Claude, GPT variants, etc.
- **Contextual understanding**: Maintains conversation history and uses it to provide relevant responses.
- **Agentic capabilities**: Can execute multi-step tasks, utilize tools, and interact with external systems.

### 2. **Mention System (`@mentions`)**
- **Purpose**: Allows users to easily bring specific entities (agents, tools, prompts, URLs, files) into the chat context.
- **Supported Mentions**:
    - `@agents/`: Switch the active AI agent or delegate tasks.
    - `@tools/`: Execute specific MCP (Model Context Protocol) tools or custom agent tools. Supports parameter input via UI.
    - `@prompts/`: Load and use pre-defined or user-saved prompts.
    - `@url/`: Fetch and summarize content from a web URL.
    - **`@files/` (Enhanced in Current Session)**:
        - **New**: Users can type `@files/` to initiate actions related to files.
        - **New**: A selection menu appears offering:
            - **"Upload Files"**: Opens the system file dialog, allowing users to upload one or more files directly. These files are then available for reference or processing.
            - **"Browse Files"**: Opens a `FileExplorerModal` where users can navigate the Piper file system (e.g., `./uploads` directory), view existing files and folders, and select an item. 
        - **New**: Upon selection from the `FileExplorerModal`, the chosen file/folder path is inserted into the chat input as a mention (e.g., `@files/path/to/selected_item.txt`).
        - This allows for easy referencing of project files, logs, or any other documents managed within Piper's file system.

### 3. **File Management (Files Tab & Mentions)**
- **File Explorer UI (`/files` tab)**: (Existing, but context for `@files/` mention)
    - Browse directories and view file listings.
    - Upload files directly through the UI.
    - Breadcrumb navigation.
- **Integration with Chat (via `@files/` mentions - New)**:
    - Seamlessly bring files from the explorer into the chat conversation for context or as targets for AI actions.
    - Option to upload new files on-the-fly when composing a message.

### 4. **Tool & MCP Integration**
- **Extensive Tool Library**: Access to a wide range of MCP tools for interacting with services like SABnzbd, Overseerr, Unraid, Plex, etc.
- **Tool Parameter Input**: UI for providing parameters to tools that require them.
- **Enhanced MCP Client**: Robust client for communicating with MCP servers, including features like tool repair and dynamic tool loading.

### 5. **Agent Management**
- **Curated & User Agents**: Access to pre-configured agents and the ability for users to define their own.
- **Agent Switching**: Easily change the active agent for the conversation.

### 6. **Prompt Management**
- **Prompt Library**: Store and reuse effective prompts.
- **Easy Insertion**: Quickly insert saved prompts into the chat.

### 7. **User Interface & Experience**
- **Modern, Responsive Design**: Clean interface built with Next.js and Tailwind CSS.
- **Real-time Updates**: Streaming responses, live metrics.
- **Modals for Selection**: Consistent use of modals for selecting agents, tools, prompts, and now for browsing files.
- **Toast Notifications**: For feedback on actions like uploads, errors, etc.
- **Attach Menu**: Provides quick access to common mention types (agents, tools, prompts, URLs, files) without typing the prefix.

### 8. **Configuration & Customization**
- **Theme Support**: (e.g., dark mode)
- **User Preferences**: Settings for various application behaviors.

## Target Users
- Developers
- System Administrators
- Power Users requiring automation and AI assistance

## Key Differentiators
- **Deep Tool Integration**: Rich set of MCP tools out-of-the-box.
- **Agentic Framework**: Ability to perform complex, multi-step operations.
- **Context-Awareness**: Sophisticated mention system and conversation history management.
- **Developer-Focused**: Designed with developer workflows in mind.
- **Extensibility**: Potential for adding new agents, tools, and models.

This product context outlines the primary features and goals of the Piper application, highlighting its role as a comprehensive AI-powered assistant.