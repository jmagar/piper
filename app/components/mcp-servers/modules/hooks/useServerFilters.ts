import { useState, useCallback, useMemo } from 'react';
import { MergedServerData, ServerFilters, DEFAULT_FILTERS } from '../utils/serverTypes';
import { filterServers, sortServers, hasActiveFilters } from '../utils/serverUtils';

export interface UseServerFiltersReturn {
  filters: ServerFilters;
  filteredAndSortedServers: MergedServerData[];
  hasActiveFilters: boolean;
  setSearchQuery: (query: string) => void;
  setStatusFilter: (status: string) => void;
  setTransportFilter: (transport: string) => void;
  setEnabledFilter: (enabled: string) => void;
  clearAllFilters: () => void;
  updateFilters: (updates: Partial<ServerFilters>) => void;
}

/**
 * Custom hook for managing server filtering and search
 */
export const useServerFilters = (servers: MergedServerData[]): UseServerFiltersReturn => {
  const [filters, setFilters] = useState<ServerFilters>(DEFAULT_FILTERS);

  const setSearchQuery = useCallback((query: string) => {
    setFilters(prev => ({ ...prev, searchQuery: query }));
  }, []);

  const setStatusFilter = useCallback((status: string) => {
    setFilters(prev => ({ ...prev, statusFilter: status }));
  }, []);

  const setTransportFilter = useCallback((transport: string) => {
    setFilters(prev => ({ ...prev, transportFilter: transport }));
  }, []);

  const setEnabledFilter = useCallback((enabled: string) => {
    setFilters(prev => ({ ...prev, enabledFilter: enabled }));
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const updateFilters = useCallback((updates: Partial<ServerFilters>) => {
    setFilters(prev => ({ ...prev, ...updates }));
  }, []);

  // Memoized filtered and sorted servers
  const filteredAndSortedServers = useMemo(() => {
    const filtered = filterServers(servers, filters);
    return sortServers(filtered);
  }, [servers, filters]);

  // Check if any filters are active
  const hasActiveFiltersValue = useMemo(() => {
    return hasActiveFilters(filters);
  }, [filters]);

  return {
    filters,
    filteredAndSortedServers,
    hasActiveFilters: hasActiveFiltersValue,
    setSearchQuery,
    setStatusFilter,
    setTransportFilter,
    setEnabledFilter,
    clearAllFilters,
    updateFilters,
  };
}; 