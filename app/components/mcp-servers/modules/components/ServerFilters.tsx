'use client';

import React from 'react';
import { ServerFilters as ServerFiltersType } from '../utils/serverTypes';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter } from 'lucide-react';

export interface ServerFiltersProps {
  filters: ServerFiltersType;
  hasActiveFilters: boolean;
  onSearchChange: (query: string) => void;
  onStatusFilterChange: (status: string) => void;
  onTransportFilterChange: (transport: string) => void;
  onEnabledFilterChange: (enabled: string) => void;
  onClearFilters: () => void;
}

export function ServerFilters({
  filters,
  hasActiveFilters,
  onSearchChange,
  onStatusFilterChange,
  onTransportFilterChange,
  onEnabledFilterChange,
  onClearFilters,
}: ServerFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search servers..."
          value={filters.searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      
      <div className="flex gap-2">
        <Select value={filters.statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger className="w-32">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="connected">Connected</SelectItem>
            <SelectItem value="disconnected">Disconnected</SelectItem>
            <SelectItem value="error">Error</SelectItem>
            <SelectItem value="no_tools_found">No Tools</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={filters.transportFilter} onValueChange={onTransportFilterChange}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Transport" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="stdio">STDIO</SelectItem>
            <SelectItem value="sse">SSE</SelectItem>
            <SelectItem value="http">HTTP</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={filters.enabledFilter} onValueChange={onEnabledFilterChange}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Enabled" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Servers</SelectItem>
            <SelectItem value="enabled">Enabled</SelectItem>
            <SelectItem value="disabled">Disabled</SelectItem>
          </SelectContent>
        </Select>
        
        {hasActiveFilters && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={onClearFilters}
            className="px-3"
          >
            Clear
          </Button>
        )}
      </div>
    </div>
  );
} 