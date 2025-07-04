# MCP Server Management UI

This directory contains all the React components, hooks, and utilities required for the MCP Server Management Dashboard, located at `/mcp-dashboard`.

## Architecture Overview

The UI is built around a main container component, `McpServersDashboard.tsx`, which orchestrates the state and interactions of various modular child components. The logic is separated into custom hooks for concerns like state management, API interactions, and filtering, promoting reusability and separation of concerns.

## File Structure

```
/app/components/mcp-servers/
├── McpServersDashboard.tsx   # Main container component
├── README.md                 # This documentation file
└── modules/
    ├── components/           # Reusable UI components for the dashboard
    ├── hooks/                # Custom React hooks for managing state and logic
    └── utils/                # Helper functions, type definitions, and validation logic
```

---

## Components (`modules/components/`)

-   **`McpServersDashboard.tsx`**: The primary entry point and container for the entire dashboard. It fetches server configurations and statuses, manages modal states, and passes data and handlers down to its children.

-   **`DashboardHeader.tsx`**: Renders the header section of the dashboard, including the title and the "Add Server" button.

-   **`ServerGrid.tsx`**: Responsible for laying out the `ServerCard` components in a responsive grid.

-   **`ServerCard.tsx`**: Displays a single MCP server's information, including its name, status, and transport type. It also contains the action menu (edit, delete, test connection, etc.).

-   **`AddServerModal.tsx`**: A modal form for adding a new MCP server configuration. Includes fields for all required server properties and performs client-side validation.

-   **`EditServerModal.tsx`**: A modal form, pre-populated with an existing server's data, for editing a configuration.

-   **`DeleteServerModal.tsx`**: A confirmation modal that prompts the user before deleting a server configuration.

-   **`ServerFilters.tsx`**: Provides UI elements (e.g., search bar, dropdowns) to filter the displayed servers.

-   **`StatusIndicator.tsx`**: A small visual component that displays the connection status of a server (e.g., connected, disconnected, error) with a colored dot and tooltip.

## Hooks (`modules/hooks/`)

-   **`useServerConfig.ts`**: Manages the state of server configurations, including fetching, adding, updating, and deleting servers via API calls to `/api/mcp/config`.

-   **`useServerStatus.ts`**: Fetches the real-time status of all MCP servers from the `/api/mcp/status` endpoint.

-   **`useServerActions.ts`**: Encapsulates the logic for actions performed on a server card, such as "Test Connection", "Copy Configuration", and "Duplicate Server". It makes the API call to the `/api/mcp/test-connection` endpoint.

-   **`useServerFilters.ts`**: Manages the state of the filters and provides the filtered list of servers to be rendered.

-   **`useModalState.ts`**: A generic hook to manage the open/closed state of the various modals (Add, Edit, Delete).

-   **`useAutoRefresh.ts`**: Implements a timer to periodically re-fetch server statuses, keeping the dashboard up-to-date.

## Utilities (`modules/utils/`)

-   **`serverTypes.ts`**: Contains all TypeScript type and interface definitions related to MCP server configurations and statuses.

-   **`serverUtils.ts`**: Provides helper functions for manipulating server configuration objects (e.g., creating a duplicate for the "Duplicate" feature).

-   **`serverValidation.ts`**: Contains client-side validation logic (likely using Zod) for the server configuration forms in the modals.
