'use client';

import * as React from 'react';

import { McpLogsViewer } from '@/components/mcp-logs-viewer';
import { SocketProvider } from '@/lib/socket';

export default function McpLogsPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-hidden">
        <SocketProvider>
          <McpLogsViewer url="/mcp/logs" />
        </SocketProvider>
      </div>
    </div>
  );
} 