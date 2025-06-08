# System Design Patterns & Architecture: Piper

**Last Updated**: Current Session (File Mention Integration)

This document outlines key system design patterns, architectural choices, and UI/UX paradigms employed in the Piper application.

## I. Core Architecture

- **Next.js Frontend**: Leverages React for UI, server-side rendering (SSR) and static site generation (SSG) capabilities of Next.js for performance and SEO where applicable.
- **Node.js Backend (Next.js API Routes)**: API endpoints are primarily implemented as Next.js API routes, facilitating a full-stack TypeScript environment.
- **PostgreSQL Database**: Primary data store, managed with Prisma ORM.
- **MCP (Model Context Protocol) Integration**: A key architectural element allowing Piper to interface with a variety of external tools and services through a standardized protocol.

## II. State Management

- **Zustand**: For global client-side state management (e.g., chat history, agent store, UI state).
- **React Context API**: Used for more localized state sharing, especially for theme or user session data.
- **React Query / SWR (Implied)**: For server state management, caching, and data fetching, reducing boilerplate for API interactions.

## III. UI/UX Patterns

1.  **Mention-Driven Interaction (`@mentions`)**:
    - **Pattern**: Users interact with complex entities (agents, tools, prompts, URLs, files) by typing `@` followed by a category prefix (e.g., `@agents/`, `@tools/`).
    - **UI Support**: A `UnifiedSelectionModal` appears as the user types, offering filtered suggestions based on the prefix and search term.
    - **Benefit**: Reduces cognitive load, provides discoverability, and streamlines complex command invocation.

2.  **Modal Dialogs for Focused Tasks**:
    - **Pattern**: Used extensively for tasks that require user input or selection without navigating away from the main chat interface.
    - **Examples**:
        - `UnifiedSelectionModal`: For selecting agents, tools, prompts.
        - `ToolParameterInput`: For providing arguments to MCP tools.
        - **`FileExplorerModal` (New)**: For browsing the file system and selecting a file/folder to mention. This pattern allows embedding a complex component (FileExplorer) within a modal for a specific, focused task (file selection for mention).
    - **Benefit**: Keeps the user in context while allowing for rich interaction for specific sub-tasks.

3.  **Progressive Disclosure for Complex Inputs**:
    - **Pattern**: Initially simple interactions (e.g., selecting a tool) can lead to further, more complex input requirements (e.g., tool parameters), which are then presented to the user.
    - **Benefit**: Avoids overwhelming the user with too many options upfront.

4.  **Real-time Feedback & Streaming**:
    - **Pattern**: LLM responses are streamed to the UI. Background operations (uploads, tool execution) provide progress indicators or toast notifications.
    - **Benefit**: Enhances perceived performance and keeps the user informed.

5.  **Attach Menu / Quick Actions**:
    - **Pattern**: A menu (often near the chat input) provides buttons or icons for quickly triggering common mention types or actions (like file upload) without needing to type the full `@prefix`.
    - **Current Session Enhancement**: The `@files/` mention, when triggered (either by typing or potentially from an attach menu item), now leads to the `UnifiedSelectionModal` which offers sub-actions: "Upload Files" and "Browse Files". This is a pattern of using an initial modal to direct to further specific actions or modals.
    - **Benefit**: Improves accessibility and speed for common operations.

6.  **Hidden Input for Native UI Triggers**:
    - **Pattern (New/Reinforced)**: For actions like file uploads that benefit from the native browser UI (system file dialog), a hidden `<input type="file">` element is used. This input is programmatically clicked (e.g., via a button in `UnifiedSelectionModal` or `AttachMenu`).
    - **Benefit**: Leverages familiar native UI for file selection while allowing custom UI elements to trigger it, providing a cleaner application interface.

7.  **Consistent Layout & Navigation**:
    - **Pattern**: Main application areas (Chat, MCP, Agents, Prompts, Files) are accessible via a consistent top navigation bar or sidebar.
    - **File Explorer UI**: Standard breadcrumbs for directory navigation, clear visual distinction between files and folders.

8.  **Error Handling & Notifications**:
    - **Pattern**: User-friendly toast notifications (e.g., using `sonner`) for errors (file validation, API issues) and success messages.
    - **Benefit**: Provides clear, non-intrusive feedback.

## IV. Backend & API Design Patterns

1.  **RESTful API Routes**: Standard HTTP methods for CRUD operations where applicable.
2.  **Streaming API for Chat**: Server-Sent Events (SSE) or WebSockets for streaming LLM responses.
3.  **Request Validation**: Using libraries like Zod for validating API request payloads.
4.  **Centralized Error Handling**: Middleware or utility functions for consistent error responses.
5.  **Path Sanitization & Security**: For file system operations (e.g., in `/api/files/list`, `/api/files/upload`), ensuring paths are validated and constrained to prevent directory traversal attacks.

## V. Code & Development Patterns

1.  **TypeScript for Type Safety**: Strict type checking throughout the codebase.
2.  **Custom Hooks (`useSomething`)**: Encapsulating complex UI logic and state management (e.g., `useAgentCommand`, `useFileUploader`). This promotes reusability and separation of concerns.
3.  **Component-Based Architecture (React)**: Building UI from reusable, composable components.
4.  **Environment Variables**: For configuration (database URLs, API keys, directory paths like `UPLOADS_DIR`).
5.  **Linting & Formatting (ESLint, Prettier)**: Maintaining code quality and consistency.

These patterns aim to create a robust, maintainable, and user-friendly application.