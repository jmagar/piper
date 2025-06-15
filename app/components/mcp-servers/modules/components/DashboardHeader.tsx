'use client';

import React from 'react';
import { MergedServerData } from '../utils/serverTypes';
import { formatRelativeTime } from '../utils/serverUtils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, RefreshCw, Clock, Eye, EyeOff, Code } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DashboardHeaderProps {
  servers: MergedServerData[];
  lastUpdated: Date | null;
  isRefreshing: boolean;
  autoRefresh: boolean;
  isDirty: boolean;
  isSaving: boolean;
  onRefresh: () => void;
  onToggleAutoRefresh: () => void;
  onAddServer: () => void;
  onSave: () => void;
  onOpenRawEditor: () => void;
}

export function DashboardHeader({
  servers,
  lastUpdated,
  isRefreshing,
  autoRefresh,
  isDirty,
  isSaving,
  onRefresh,
  onToggleAutoRefresh,
  onAddServer,
  onSave,
  onOpenRawEditor,
}: DashboardHeaderProps) {
  const enabledServersCount = servers.filter(server => server.enabled).length;
  const totalServersCount = servers.length;

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
      <div className="flex items-center gap-3">
        <h3 className="text-xl font-semibold text-foreground">MCP Servers</h3>
        <Badge variant="secondary" className="bg-muted text-muted-foreground font-medium">
          {enabledServersCount} of {totalServersCount} servers
        </Badge>
        {lastUpdated && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {formatRelativeTime(lastUpdated)}
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <Button 
          variant="outline" 
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          className={cn(
            "flex items-center gap-2",
            isRefreshing && "animate-spin"
          )}
        >
          <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
        
        <Button 
          variant="outline" 
          size="sm"
          onClick={onToggleAutoRefresh}
          className={cn(
            "flex items-center gap-2",
            autoRefresh ? "bg-green-50 text-green-700 border-green-200" : ""
          )}
        >
          {autoRefresh ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          <span className="hidden sm:inline">Auto</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onOpenRawEditor}
          className="flex items-center gap-2 hover:bg-accent transition-colors"
        >
          <Code className="h-4 w-4" />
          <span className="hidden sm:inline">Raw</span>
        </Button>
        
        <Button 
          variant="outline" 
          size="sm"
          onClick={onAddServer}
          className="flex items-center gap-2 hover:bg-accent transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden xs:inline">Add</span>
        </Button>
        
        <Button 
          onClick={onSave}
          disabled={!isDirty || isSaving}
          size="sm"
          variant={isDirty ? "default" : "outline"}
          className={cn(
            "flex items-center gap-2 transition-all",
            isDirty && "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
        >
          {isSaving ? 'Saving...' : 'Save'}
          {isDirty && <span className="text-xs opacity-75">*</span>}
        </Button>
      </div>
    </div>
  );
} 