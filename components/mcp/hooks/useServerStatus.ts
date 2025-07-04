import { useState, useCallback, useEffect } from 'react';
import { McpServerInfo } from '@/app/api/mcp-servers/route';

export interface UseServerStatusReturn {
  servers: McpServerInfo[];
  isLoading: boolean;
  error: string | null;
  fetchServerStatus: () => Promise<void>;
  clearError: () => void;
}

/**
 * Custom hook for managing server status data
 */
export const useServerStatus = (): UseServerStatusReturn => {
  const [servers, setServers] = useState<McpServerInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const fetchServerStatus = useCallback(async () => {
    setError(null);
    try {
      const response = await fetch('/api/mcp-servers');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Error: ${response.status}`);
      }
      const data: McpServerInfo[] = await response.json();
      setServers(data);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch server data';
      setError(errorMessage);
      setServers([]); // Clear any existing server data on error
    }
  }, []);

  // Initial load
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      await fetchServerStatus();
      setIsLoading(false);
    };

    loadInitialData();
  }, [fetchServerStatus]);

  return {
    servers,
    isLoading,
    error,
    fetchServerStatus,
    clearError,
  };
}; 