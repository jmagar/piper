import React from 'react';

/**
 * Container for log entries with virtualized scrolling
 */
interface LogsContainerProps {
  logs: Array<{
    timestamp: string;
    namespace: string;
    level: 'info' | 'error' | 'debug';
    message: string;
    server?: string;
  }>;
  filteredNamespaces?: string[];
}

/**
 * Component to display logs in a scrollable container
 */
export function LogsContainer({ logs, filteredNamespaces = [] }: LogsContainerProps) {
  return (
    <div className="h-full overflow-y-auto bg-muted/20 rounded-md p-2 font-mono text-sm">
      {logs
        .filter(log => !filteredNamespaces.includes(log.namespace))
        .map((log, index) => (
          <div 
            key={`${log.timestamp}-${index}`}
            className="py-1 border-b border-border/30 last:border-0"
          >
            <span className="text-muted-foreground mr-2">{new Date(log.timestamp).toLocaleTimeString()}</span>
            <span className="font-semibold mr-2">[{log.namespace}]</span>
            <span className={log.level === 'error' ? 'text-destructive' : log.level === 'debug' ? 'text-yellow-500' : ''}>{log.message}</span>
          </div>
        ))}
    </div>
  );
} 