# Technical Context: Piper Chat Application

**Last Updated**: Current Session (File Mention Integration)

## Core Technologies

- **Frontend**: 
    - **Next.js 13+ (App Router)**: React framework for UI, routing, SSR/SSG.
    - **React 18**: Core UI library.
    - **TypeScript**: For static typing and improved code quality.
    - **Tailwind CSS**: Utility-first CSS framework for styling.
    - **Shadcn/ui**: Re-usable UI components built with Radix UI and Tailwind CSS.
    - **Zustand**: State management.
    - **Lucide React**: Icon library.
    - **Sonner**: Toast notifications.
    - **`path-browserify`**: Client-side path manipulation for file explorer features.

- **Backend (Primarily Next.js API Routes)**:
    - **Node.js**: JavaScript runtime.
    - **TypeScript**: For backend logic.
    - **Prisma**: ORM for database interaction (PostgreSQL).
    - **AI SDK (Vercel AI SDK)**: For streaming LLM responses and tool handling.

- **Database**:
    - **PostgreSQL**: Relational database for storing application data (chats, prompts, agents, metrics, etc.).

- **MCP (Model Context Protocol) Ecosystem**:
    - **Custom MCP Servers**: Separate services providing tools (e.g., SABnzbd, Overseerr integration).
    - **Enhanced MCP Client (Modular Architecture)**: Comprehensive modular system under `lib/mcp/enhanced/` featuring:
        - **types.ts**: Core TypeScript interfaces and error classes
        - **config.ts**: Configuration management and validation
        - **metrics-collector.ts**: PostgreSQL-integrated performance tracking
        - **tool-repair.ts**: AI-powered tool call repair using GPT-4o-mini
        - **multimodal-handler.ts**: Multi-modal content processing (images, files, audio, video)
        - **client-factory.ts**: Transport-specific client creation (stdio/SSE/HTTP)
        - **managed-client.ts**: Lifecycle management with retry logic
        - **connection-pool.ts**: Multi-client connection management and health monitoring
        - **index.ts**: Unified exports maintaining backward compatibility

## Key Components & Modules (Focus on Current Session's Impact)

1.  **Chat Input & Mention System**:
    - **`chat-input.tsx`**: 
        - Main component for user text input, sending messages, and displaying selected entities (agent, tool, prompt, URL, files).
        - **Current Session**: Heavily modified to integrate the new file mention workflow. Manages a hidden file input for uploads triggered from `UnifiedSelectionModal`. Renders `FileExplorerModal` conditionally. Provides new callbacks (`handleTriggerFileUpload`, `handleTriggerFileBrowse`) to `UnifiedSelectionModal`. Adapts `onUrlSubmit` prop for `UnifiedSelectionModal`.
    - **`useAgentCommand.ts` (Custom Hook)**:
        - Core logic for processing `@mentions` in the chat input.
        - Manages active mention type, search terms, filtering of suggestions (agents, tools, prompts).
        - Handles opening/closing of selection modals.
        - **Current Session**: Significantly updated to support `@files/` mentions. Manages state for `FileExplorerModal` (`isFileExplorerModalOpen`, `setIsFileExplorerModalOpen`). Includes `handleFileMentionSelectedFromModal` to insert the selected file path. Its return object was refined to include necessary setters for `chat-input.tsx`.
    - **`UnifiedSelectionModal.tsx`**: 
        - Generic modal for displaying lists of agents, tools, or prompts based on the active mention type.
        - **Current Session**: Modified to handle `activeCommandType: 'files'`. Instead of a list, it now shows two options: "Upload Files" (triggers a callback to `chat-input.tsx` to click a hidden file input) and "Browse Files" (triggers a callback to open `FileExplorerModal`).
    - **`FileExplorerModal.tsx` (New Component)**:
        - A modal dialog that wraps the `FileExplorer` component.
        - Launched when user selects "Browse Files" from `UnifiedSelectionModal` (for `@files/` mentions).
        - Allows navigation and selection of files/folders from Piper's file system.
        - Uses the `onFileSelectForMention` prop (passed from `chat-input.tsx` via `useAgentCommand.ts`) to communicate the selected path back for insertion into the chat input.

2.  **File Management System**:
    - **`file-explorer.tsx`**: 
        - UI component for displaying directory listings, handling navigation (breadcrumbs), and integrating file uploads.
        - **Current Session (related to overall feature)**: Enhanced with item selection state (`selectedItemPath`), UI highlighting for selection, and an "Attach Selected File" button that uses the `onFileSelectForMention` prop (provided when used within `FileExplorerModal`).
    - **`file-uploader.tsx`**: Component for handling file uploads with progress.
    - **Backend APIs**:
        - `/api/files/list/route.ts`: Lists files and directories.
        - `/api/files/upload/route.ts`: Handles file uploads.
        - These APIs use `UPLOADS_DIR` environment variable.

3.  **UI Component Library (`@/components/ui`)**:
    - Based on Shadcn/ui (Dialog, Button, Table, Input, etc.).
    - Used extensively for building modals, forms, and other UI elements.

## Development & Build Tools

- **npm/pnpm/yarn**: Package management.
- **ESLint**: JavaScript/TypeScript linter.
- **Prettier**: Code formatter.
- **Docker**: For containerization and deployment.

## Key Libraries & Their Roles

- **`react`**: Core UI library.
- **`next`**: Framework for React applications.
- **`typescript`**: Language for static typing.
- **`tailwindcss`**: CSS framework.
- **`@radix-ui/react-dialog` (via Shadcn)**: For accessible modal components (used by `FileExplorerModal` and `UnifiedSelectionModal`).
- **`lucide-react`**: Icons.
- **`zustand`**: Global state management.
- **`prisma`**: Database ORM.
- **`sonner`**: Toast notifications.
- **`path-browserify`**: Client-side path manipulation (used in `FileExplorer` and related components).
- **Vercel AI SDK**: For LLM interaction, including tool definition and response streaming.

This technical context provides an overview of the stack and key modules involved in Piper, with emphasis on those touched by the recent file mention integration work.