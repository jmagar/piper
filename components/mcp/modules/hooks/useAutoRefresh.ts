import { useState, useCallback, useEffect, useRef } from 'react';

export interface UseAutoRefreshReturn {
  isRefreshing: boolean;
  autoRefresh: boolean;
  lastUpdated: Date | null;
  isClient: boolean;
  toggleAutoRefresh: () => void;
  manualRefresh: () => Promise<void>;
  setLastUpdated: (date: Date) => void;
}

export interface UseAutoRefreshOptions {
  refreshFn: () => Promise<void>;
  intervalMs?: number;
  enabled?: boolean;
}

/**
 * Custom hook for managing auto-refresh functionality
 */
export const useAutoRefresh = ({
  refreshFn,
  intervalMs = 30000, // 30 seconds default
  enabled = true
}: UseAutoRefreshOptions): UseAutoRefreshReturn => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(enabled);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isClient, setIsClient] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const toggleAutoRefresh = useCallback(() => {
    setAutoRefresh(prev => !prev);
  }, []);

  const manualRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshFn();
      setLastUpdated(new Date());
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshFn]);

  // Set client-side flag to prevent hydration mismatch
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Auto-refresh logic
  useEffect(() => {
    if (!autoRefresh || !isClient) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    
    const interval = setInterval(async () => {
      if (!isRefreshing) { // Prevent overlapping refreshes
        setIsRefreshing(true);
        try {
          await refreshFn();
          setLastUpdated(new Date());
        } finally {
          setIsRefreshing(false);
        }
      }
    }, intervalMs);

    intervalRef.current = interval;

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [autoRefresh, isClient, refreshFn, intervalMs, isRefreshing]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    isRefreshing,
    autoRefresh,
    lastUpdated,
    isClient,
    toggleAutoRefresh,
    manualRefresh,
    setLastUpdated,
  };
}; 