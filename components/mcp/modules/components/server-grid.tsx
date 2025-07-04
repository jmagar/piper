'use client';

import React from 'react';
import { MergedServerData } from '../utils/serverTypes';
import { ServerCard } from './ServerCard';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Settings } from 'lucide-react';

export interface ServerGridProps {
  servers: MergedServerData[];
  isClient: boolean;
  isLoading: boolean;
  totalServersCount: number;
  onToggleEnabled: (serverId: string) => void;
  onCopyConfig: (server: MergedServerData) => void;
  onDuplicate: (server: MergedServerData) => void;
  onTestConnection: (server: MergedServerData) => void;
  onEdit: (server: MergedServerData) => void;
  onDelete: (server: MergedServerData) => void;
}

export function ServerGrid({
  servers,
  isClient,
  isLoading,
  totalServersCount,
  onToggleEnabled,
  onCopyConfig,
  onDuplicate,
  onTestConnection,
  onEdit,
  onDelete,
}: ServerGridProps) {
  // Loading state
  if (!isClient || isLoading) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
          <Settings className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground text-sm">Loading MCP servers...</p>
      </div>
    );
  }

  // Empty state
  if (servers.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
          <Settings className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground text-sm">
          {totalServersCount === 0 
            ? 'No MCP servers configured or found.' 
            : 'No servers match your search criteria.'
          }
        </p>
        <p className="text-muted-foreground text-xs mt-1">
          {totalServersCount === 0 
            ? 'Add a server to get started.' 
            : 'Try adjusting your search or filters.'
          }
        </p>
      </div>
    );
  }

  // Server grid
  return (
    <ScrollArea className="flex-grow w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 p-1">
        {servers.map((server) => (
          <ServerCard
            key={server.key}
            server={server}
            onToggleEnabled={onToggleEnabled}
            onCopyConfig={onCopyConfig}
            onDuplicate={onDuplicate}
            onTestConnection={onTestConnection}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </ScrollArea>
  );
} 