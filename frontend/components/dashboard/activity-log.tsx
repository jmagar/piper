"use client";

import * as React from 'react';
import { 
  MessageSquare, 
  Bot, 
  Wrench, 
  FileUp, 
  FileDown, 
  Search,
  File,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

/**
 * Props for the ActivityLog component
 */
interface ActivityLogProps {
  /** Maximum number of activities to display */
  limit?: number;
  /** When true, displays a compact version of the component */
  compact?: boolean;
}

type ActivityType = 'chat' | 'tool' | 'document' | 'login' | 'system' | 'search';

interface Activity {
  id: string;
  type: ActivityType;
  description: string;
  timestamp: string;
  details?: Record<string, any>;
}

/**
 * ActivityLog Component
 * 
 * Displays a log of user activity
 */
export function ActivityLog({ limit = 10, compact = false }: ActivityLogProps) {
  // Mock data - in a real implementation, these would be fetched from an API with user-specific data
  const [activities, setActivities] = React.useState<Activity[]>([
    {
      id: '1',
      type: 'chat',
      description: 'Started new conversation "Project Planning"',
      timestamp: '2024-03-03T16:45:22Z',
      details: { chatId: '123', messageCount: 5 }
    },
    {
      id: '2',
      type: 'tool',
      description: 'Used Web Search tool',
      timestamp: '2024-03-03T16:30:15Z',
      details: { toolId: '1', serverId: '1' }
    },
    {
      id: '3',
      type: 'document',
      description: 'Uploaded "Market Analysis.pdf"',
      timestamp: '2024-03-03T15:45:33Z',
      details: { documentId: '456', size: 1240000 }
    },
    {
      id: '4',
      type: 'search',
      description: 'Searched for "quarterly report template"',
      timestamp: '2024-03-03T14:22:18Z'
    },
    {
      id: '5',
      type: 'tool',
      description: 'Used Code Interpreter tool',
      timestamp: '2024-03-03T13:15:22Z',
      details: { toolId: '3', serverId: '2' }
    },
    {
      id: '6',
      type: 'chat',
      description: 'Continued conversation "API Documentation"',
      timestamp: '2024-03-03T11:30:45Z',
      details: { chatId: '456', messageCount: 8 }
    },
    {
      id: '7',
      type: 'document',
      description: 'Downloaded "Financial Report.xlsx"',
      timestamp: '2024-03-03T10:05:12Z'
    },
    {
      id: '8',
      type: 'system',
      description: 'Updated OpenAI API key',
      timestamp: '2024-03-02T17:30:45Z'
    }
  ]);

  // Sort activities by timestamp (newest first)
  const sortedActivities = [...activities].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Limit the number of activities to display
  const limitedActivities = sortedActivities.slice(0, limit);

  // Format date to relative time (e.g., "2 hours ago")
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return `${diffInSeconds} seconds ago`;
    } else if (diffInSeconds < 3600) {
      return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    } else if (diffInSeconds < 86400) {
      return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    } else {
      return `${Math.floor(diffInSeconds / 86400)} days ago`;
    }
  };

  // Get the icon for each activity type
  const getActivityIcon = (type: ActivityType) => {
    switch (type) {
      case 'chat':
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'tool':
        return <Wrench className="h-4 w-4 text-amber-500" />;
      case 'document':
        return <File className="h-4 w-4 text-green-500" />;
      case 'login':
        return <Bot className="h-4 w-4 text-purple-500" />;
      case 'system':
        return <Bot className="h-4 w-4 text-red-500" />;
      case 'search':
        return <Search className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  // Get the badge for each activity type
  const getActivityBadge = (type: ActivityType) => {
    switch (type) {
      case 'chat':
        return <Badge className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20">Chat</Badge>;
      case 'tool':
        return <Badge className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20">Tool</Badge>;
      case 'document':
        return <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">Document</Badge>;
      case 'login':
        return <Badge className="bg-purple-500/10 text-purple-500 hover:bg-purple-500/20">Login</Badge>;
      case 'system':
        return <Badge className="bg-red-500/10 text-red-500 hover:bg-red-500/20">System</Badge>;
      case 'search':
        return <Badge className="bg-gray-500/10 text-gray-500 hover:bg-gray-500/20">Search</Badge>;
      default:
        return null;
    }
  };

  if (compact) {
    return (
      <div className="space-y-2">
        <h3 className="font-medium">Recent Activity</h3>
        <div className="space-y-1">
          {limitedActivities.slice(0, 3).map(activity => (
            <div key={activity.id} className="flex items-center justify-between">
              <div className="flex items-center">
                {getActivityIcon(activity.type)}
                <span className="ml-2 text-sm truncate max-w-[180px]">{activity.description}</span>
              </div>
              <span className="text-xs text-muted-foreground">{formatRelativeTime(activity.timestamp)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Activity Log</CardTitle>
        <CardDescription>
          Your recent actions and interactions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {limitedActivities.length > 0 ? (
            limitedActivities.map(activity => (
              <div key={activity.id} className="flex items-start justify-between border-b pb-3 last:border-0 last:pb-0">
                <div className="flex">
                  <div className="mr-2 mt-0.5">{getActivityIcon(activity.type)}</div>
                  <div>
                    <div className="font-medium">{activity.description}</div>
                    <div className="flex items-center mt-1">
                      <Clock className="h-3 w-3 text-muted-foreground mr-1" />
                      <span className="text-xs text-muted-foreground">{formatRelativeTime(activity.timestamp)}</span>
                    </div>
                  </div>
                </div>
                <div>
                  {getActivityBadge(activity.type)}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              No recent activity
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 