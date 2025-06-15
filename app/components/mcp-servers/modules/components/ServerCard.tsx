'use client';

import React from 'react';
import { MergedServerData } from '../utils/serverTypes';
import { getTransportDisplayInfo } from '../utils/serverUtils';
import { StatusIndicator } from './StatusIndicator';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { 
  MoreVertical, 
  TestTube, 
  Copy, 
  Files, 
  Pencil, 
  Trash2 
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ServerCardProps {
  server: MergedServerData;
  onToggleEnabled: (serverId: string) => void;
  onCopyConfig: (server: MergedServerData) => void;
  onDuplicate: (server: MergedServerData) => void;
  onTestConnection: (server: MergedServerData) => void;
  onEdit: (server: MergedServerData) => void;
  onDelete: (server: MergedServerData) => void;
}

export function ServerCard({
  server,
  onToggleEnabled,
  onCopyConfig,
  onDuplicate,
  onTestConnection,
  onEdit,
  onDelete,
}: ServerCardProps) {
  const transportInfo = server.configData ? getTransportDisplayInfo(server.configData.transport) : {};

  const getStatusBadge = () => {
    if (server.status === 'success') {
      return (
        <Badge variant="outline" className="text-xs border-green-200 text-green-700 bg-green-50">
          {server.tools.length} tools
        </Badge>
      );
    } else if (server.status === 'error') {
      return (
        <Badge variant="outline" className="text-xs border-red-200 text-red-700 bg-red-50">
          Error
        </Badge>
      );
    } else if (server.status === 'no_tools_found') {
      return (
        <Badge variant="outline" className="text-xs border-yellow-200 text-yellow-700 bg-yellow-50">
          No tools
        </Badge>
      );
    } else if (!server.enabled) {
      return (
        <Badge variant="outline" className="text-xs border-gray-200 text-gray-600 bg-gray-50">
          Disabled
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="text-xs">
          Unknown
        </Badge>
      );
    }
  };

  const hasConfigData = !!server.configData;

  return (
    <HoverCard openDelay={300} closeDelay={100}>
      <HoverCardTrigger asChild>
        <div className={cn(
          "group relative rounded-lg border bg-card p-4 transition-all duration-200 cursor-pointer",
          "hover:shadow-md hover:shadow-border/10 hover:-translate-y-0.5",
          "border-border/50 hover:border-border",
          !server.enabled && "opacity-60"
        )}>
          {/* Server Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <StatusIndicator status={server.status} className="shrink-0" />
              <div className="min-w-0 flex-1">
                <h4 className="font-medium text-sm text-foreground truncate" title={server.label}>
                  {server.label}
                </h4>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {server.transportType || 'Unknown transport'}
                </p>
                {hasConfigData && (
                  <>
                    {transportInfo.command && (
                      <p className="text-[10px] text-muted-foreground/80 truncate mt-0.5" title={transportInfo.command}>
                        cmd: {transportInfo.command}
                      </p>
                    )}
                    {transportInfo.url && (
                      <p className="text-[10px] text-muted-foreground/80 truncate mt-0.5" title={transportInfo.url}>
                        url: {transportInfo.url}
                      </p>
                    )}
                    {transportInfo.args && (
                      <p className="text-[10px] text-muted-foreground/60 truncate mt-0.5" title={transportInfo.args}>
                        args: {transportInfo.args}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
            <Switch
              checked={server.enabled}
              onCheckedChange={() => hasConfigData && onToggleEnabled(server.configData!.id)}
              aria-label={`Toggle ${server.label} ${server.enabled ? 'off' : 'on'}`}
              className="shrink-0"
              disabled={!hasConfigData}
            />
          </div>
          
          {/* Status Info */}
          <div className="mb-3">
            {getStatusBadge()}
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-1">
            {hasConfigData && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost" 
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-accent"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => onTestConnection(server)}>
                    <TestTube className="h-4 w-4 mr-2" />
                    Test Connection
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onCopyConfig(server)}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Configuration
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDuplicate(server)}>
                    <Files className="h-4 w-4 mr-2" />
                    Duplicate Server
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onEdit(server)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit Server
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onDelete(server)}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Server
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </HoverCardTrigger>
      <HoverCardContent className="w-80 max-h-64 overflow-y-auto" side="top" align="start">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <StatusIndicator status={server.status} />
            <h4 className="font-semibold text-sm">{server.label}</h4>
          </div>
          
          {server.status === 'error' && server.errorDetails && (
            <div className="p-2 bg-red-50 border border-red-200 rounded-md">
              <p className="text-xs text-red-700 font-medium">Error Details:</p>
              <p className="text-xs text-red-600 mt-1">{server.errorDetails}</p>
            </div>
          )}
          
          {server.tools.length > 0 ? (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Available Tools:</p>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {server.tools.map((tool) => (
                  <div key={tool.name} className="p-2 bg-muted rounded-md">
                    <p className="font-medium text-xs text-foreground">{tool.name}</p>
                    {tool.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {tool.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              {server.status === 'error' ? 'Cannot load tools due to connection error.' : 
               server.status === 'no_tools_found' ? 'Server connected but no tools available.' :
               'No tools available or server not connected.'}
            </p>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
} 