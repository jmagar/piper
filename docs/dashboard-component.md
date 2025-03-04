# Dashboard Component System
_Last Updated: March 10, 2024 2:45 PM EST_

## Overview

The Dashboard Component System provides a comprehensive administrative interface for monitoring system activity, server status, document usage, and user prompts. It implements a modular architecture with specialized components that can be used individually or composed together in the main dashboard layout.

## Resources Used

- [Lucide React](https://lucide.dev/): Icon library used throughout the dashboard components
- [date-fns](https://date-fns.org/): Library used for date formatting and relative time displays
- [shadcn/ui](https://ui.shadcn.com/): Component library for UI elements like Cards, Tabs, and Badges

## Solution

The Dashboard implements a flexible, modular design with the following key components:

1. **DashboardLayout**: Main container that organizes all dashboard components in a tabbed interface
2. **DashboardCards**: Summary metrics displayed as card components
3. **McpServerStats**: Server status monitoring with detailed metrics
4. **DocumentStats**: Document usage statistics and analytics
5. **ActivityLog**: Chronological record of user activities and system events
6. **Prompts**: Displays user's prompt templates with usage information

## Implementation Details

### 1. Dashboard Layout Component

The `DashboardLayout` serves as the main container for all dashboard components, implementing a tabbed interface for easy navigation between different dashboard views.

```typescript
// frontend/components/dashboard/dashboard-layout.tsx
"use client";

import * as React from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import {
  BarChart, 
  BookOpen, 
  Bot,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { McpServerStats } from "./mcp-server-stats";
import { DocumentStats } from "./document-stats";
import { ActivityLog } from "./activity-log";
import { AlertsSection } from "./alerts-section";
import { PromptCards } from "./prompts";

export function DashboardLayout() {
  return (
    <AppLayout title="Dashboard">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4" />
            <span className="text-sm text-muted-foreground">
              Last updated: {new Date().toLocaleString()}
            </span>
          </div>
        </div>
        
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="mcp">MCP</TabsTrigger>
            <TabsTrigger value="documents">Knowledge Base</TabsTrigger>
            <TabsTrigger value="logs">Activity Logs</TabsTrigger>
          </TabsList>
          
          {/* Tab contents omitted for brevity */}
        </Tabs>
      </div>
    </AppLayout>
  );
}
```

### 2. Dashboard Cards Component

The `DashboardCards` component displays key metrics in a grid of card components, providing at-a-glance information about system usage.

```typescript
// frontend/components/dashboard/dashboard-cards.tsx
export function DashboardCards({ className }: DashboardCardsProps) {
  const [stats] = useState({
    totalMessages: 1248,
    totalChats: 36,
    mcpServers: 4,
    mcpTools: 12,
    documents: 156,
    prompts: 27
  });

  return (
    <div className={`grid gap-4 md:grid-cols-2 lg:grid-cols-4 ${className}`}>
      {/* Cards for displaying metrics */}
    </div>
  );
}
```

### 3. MCP Server Stats Component

The `McpServerStats` component provides detailed information about MCP (Multi-modal Cognitive Pipeline) servers and their tools.

```typescript
// frontend/components/dashboard/mcp-server-stats.tsx
export function McpServerStats({ compact = false }: McpServerStatsProps) {
  const [servers] = useState<McpServer[]>([
    // Mock data for server information
  ]);

  const [tools] = useState<McpTool[]>([
    // Mock data for tools information
  ]);

  // Rendering logic for servers and tools
}
```

### 4. Activity Log Component

The `ActivityLog` component displays a chronological record of user activities and system events, with support for different activity types.

```typescript
// frontend/components/dashboard/activity-log.tsx
export function ActivityLog({ limit = 5, compact = false }: ActivityLogProps) {
  const [activities] = useState<Activity[]>(mockActivities);
  
  // Sort activities by timestamp (newest first)
  const sortedActivities = [...activities]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);

  // Formatting and rendering logic
}
```

## API Reference

### DashboardLayout Component

- **Description**: Main container component that organizes all dashboard components
- **Props**: None
- **Returns**: JSX Element with the complete dashboard interface

### DashboardCards Component

- **Description**: Displays key metrics in a grid of card components
- **Props**:
  - `className?: string` - Optional CSS class for customizing the component

### McpServerStats Component

- **Description**: Displays MCP server status and tool information
- **Props**:
  - `compact?: boolean` - When true, displays a compact version of the component (default: false)

### DocumentStats Component

- **Description**: Displays document usage statistics
- **Props**:
  - `compact?: boolean` - When true, displays a compact version of the component (default: false)
  - `limit?: number` - Maximum number of documents to display (default: 5)

### ActivityLog Component

- **Description**: Displays a chronological log of user activities
- **Props**:
  - `limit?: number` - Maximum number of activities to display (default: 5)
  - `compact?: boolean` - When true, displays a compact version of the component (default: false)

## Technical Details

### Mock Data Usage

The current implementation uses mock data for demonstration purposes. In a production environment, these components would fetch real data from API endpoints:

```typescript
// Example of how real data would be fetched
useEffect(() => {
  const fetchData = async () => {
    try {
      const response = await fetch('/api/dashboard/activity-log');
      const data = await response.json();
      setActivities(data);
    } catch (error) {
      console.error('Error fetching activity log:', error);
    }
  };
  
  fetchData();
}, []);
```

### Component Composition

The dashboard system uses a modular approach where components can be used individually or composed together:

1. The `DashboardLayout` serves as a container for all dashboard components
2. Each component (`ActivityLog`, `McpServerStats`, etc.) can be used independently
3. Components support a `compact` prop for displaying condensed versions when space is limited

## Benefits

1. **Modular Design**: Components can be used independently or composed together
2. **Responsive Layout**: Adapts to different screen sizes with appropriate layouts
3. **Comprehensive Monitoring**: Provides a complete view of system status across multiple domains
4. **Customizable Display**: Components support different display modes (compact vs. full)

## Future Enhancements

1. Replace mock data with real API integrations
2. Add real-time updates using WebSockets
3. Implement data visualization charts for analytics
4. Add more filtering and sorting options for logs and statistics
5. Create printable/exportable reports from dashboard data 