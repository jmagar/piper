"use client";

import * as React from 'react';
import { 
  AlertCircle, 
  Info, 
  CheckCircle2,
  Clock,
  X
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

type AlertType = 'error' | 'warning' | 'info' | 'success';

interface UserAlert {
  id: string;
  type: AlertType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

/**
 * Props for the AlertsSection component
 */
interface AlertsSectionProps {
  /** When true, displays a compact version of the component */
  compact?: boolean;
}

/**
 * AlertsSection Component
 * 
 * Displays user notifications and system alerts
 */
export function AlertsSection({ compact = false }: AlertsSectionProps) {
  // Mock data - in a real implementation, these would be fetched from an API
  const [alerts, setAlerts] = React.useState<UserAlert[]>([
    {
      id: '1',
      type: 'info',
      title: 'New MCP Tool Available',
      message: 'A new "File Analyzer" tool has been added to your OpenAI server.',
      timestamp: '2024-03-03T16:30:45Z',
      read: false
    },
    {
      id: '2',
      type: 'success',
      title: 'Knowledge Base Updated',
      message: 'Your knowledge base has been successfully updated with 3 new documents.',
      timestamp: '2024-03-03T10:15:22Z',
      read: false
    },
    {
      id: '3',
      type: 'warning',
      title: 'API Key Expiring Soon',
      message: 'Your OpenAI API key will expire in 7 days. Please update it to avoid service interruption.',
      timestamp: '2024-03-02T14:45:33Z',
      read: true
    },
    {
      id: '4',
      type: 'error',
      title: 'Connection Error',
      message: 'Failed to connect to Local LLM server. Check your network settings.',
      timestamp: '2024-03-02T09:30:18Z',
      read: true
    }
  ]);

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

  // Mark an alert as read
  const markAsRead = (id: string) => {
    setAlerts(alerts.map(alert => 
      alert.id === id ? { ...alert, read: true } : alert
    ));
  };

  // Dismiss an alert
  const dismissAlert = (id: string) => {
    setAlerts(alerts.filter(alert => alert.id !== id));
  };

  // Get the appropriate icon for each alert type
  const getAlertIcon = (type: AlertType) => {
    switch (type) {
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-amber-500" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  // Get the appropriate CSS class for each alert type
  const getAlertClass = (type: AlertType) => {
    switch (type) {
      case 'error':
        return 'border-destructive';
      case 'warning':
        return 'border-amber-500';
      case 'info':
        return 'border-blue-500';
      case 'success':
        return 'border-green-500';
      default:
        return '';
    }
  };

  // Filter unread alerts
  const unreadAlerts = alerts.filter(alert => !alert.read);

  if (alerts.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        You have no notifications
      </div>
    );
  }

  // Compact view for small card
  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Notifications</h3>
          <span className="text-xs text-muted-foreground">
            {unreadAlerts.length} unread
          </span>
        </div>
        <div className="space-y-2">
          {alerts.slice(0, 3).map((alert) => (
            <div 
              key={alert.id} 
              className={`relative px-2 py-1 border-l-2 ${getAlertClass(alert.type)} rounded-sm ${!alert.read ? 'bg-muted/30' : ''}`}
            >
              <div className="flex items-center">
                {getAlertIcon(alert.type)}
                <span className={`ml-1 text-sm truncate ${!alert.read ? 'font-medium' : ''}`}>
                  {alert.title}
                </span>
              </div>
              <div className="flex items-center mt-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3 mr-1" />
                {formatRelativeTime(alert.timestamp)}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {unreadAlerts.length > 0 && (
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium">Notifications ({unreadAlerts.length} unread)</h3>
          {unreadAlerts.length > 0 && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setAlerts(alerts.map(alert => ({ ...alert, read: true })))}
            >
              Mark all as read
            </Button>
          )}
        </div>
      )}

      <div className="space-y-2">
        {alerts.map((alert) => (
          <Alert 
            key={alert.id}
            className={`${getAlertClass(alert.type)} ${!alert.read ? 'bg-muted/50' : ''} relative`}
          >
            <div className="absolute right-2 top-2 flex gap-2">
              {!alert.read && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-5 w-5" 
                  onClick={() => markAsRead(alert.id)}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="sr-only">Mark as read</span>
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-5 w-5" 
                onClick={() => dismissAlert(alert.id)}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Dismiss</span>
              </Button>
            </div>
            
            <div className="flex gap-2">
              {getAlertIcon(alert.type)}
              <AlertTitle className={!alert.read ? 'font-semibold' : ''}>
                {alert.title}
              </AlertTitle>
            </div>
            
            <AlertDescription className="mt-2 ml-6">
              <p>{alert.message}</p>
              <div className="mt-1 flex items-center text-xs text-muted-foreground">
                <Clock className="mr-1 h-3 w-3" />
                {formatRelativeTime(alert.timestamp)}
              </div>
            </AlertDescription>
          </Alert>
        ))}
      </div>
    </div>
  );
} 