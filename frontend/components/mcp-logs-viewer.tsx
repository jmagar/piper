'use client';

import * as React from 'react';
import { MarkdownEditor } from './ui/markdown-editor/markdown-editor';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

/**
 * Props for the MCP Logs Viewer component
 */
interface McpLogsViewerProps {
  /** The log content to display */
  content?: string;
  /** Whether the logs are currently loading */
  isLoading?: boolean;
  /** Optional CSS class for the container */
  className?: string;
  /** Height of the logs viewer */
  height?: number | string;
  /** Timestamp when the logs were last fetched */
  lastFetched?: Date;
}

/**
 * Component for viewing MCP logs with syntax highlighting
 * 
 * @example
 * ```tsx
 * <McpLogsViewer 
 *   content={logData} 
 *   isLoading={loading} 
 *   height={600} 
 * />
 * ```
 */
export default function McpLogsViewer({
  content = '',
  isLoading = false,
  className,
  height = 600,
  lastFetched,
}: McpLogsViewerProps) {
  return (
    <div className={cn('logs-viewer border rounded-md', className)}>
      <div className="bg-muted px-4 py-2 border-b flex justify-between items-center">
        <h3 className="font-medium">MCP Logs</h3>
        {lastFetched && (
          <div className="text-xs text-muted-foreground">
            Last updated: {lastFetched.toLocaleTimeString()}
          </div>
        )}
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center p-8" style={{ height: typeof height === 'number' ? `${height - 48}px` : height }}>
          <div className="animate-pulse text-muted-foreground">Loading logs...</div>
        </div>
      ) : content ? (
        <ScrollArea className="h-full" style={{ height: typeof height === 'number' ? `${height - 48}px` : height }}>
          <div className="p-4 font-mono text-sm whitespace-pre-wrap">
            {content}
          </div>
        </ScrollArea>
      ) : (
        <div className="flex items-center justify-center p-8 text-muted-foreground" style={{ height: typeof height === 'number' ? `${height - 48}px` : height }}>
          No logs available
        </div>
      )}
    </div>
  );
} 