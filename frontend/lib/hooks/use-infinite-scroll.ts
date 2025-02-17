import { useCallback, useEffect, useRef, useState } from 'react';

interface UseInfiniteScrollOptions<T> {
  fetchData: (page: number) => Promise<{
    data: T[];
    hasMore: boolean;
  }>;
  initialData?: T[];
  threshold?: number;
}

export function useInfiniteScroll<T>({
  fetchData,
  initialData = [],
  threshold = 100
}: UseInfiniteScrollOptions<T>) {
  const [data, setData] = useState<T[]>(initialData);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const loadingRef = useRef(false);
  const lastElementRef = useRef<HTMLDivElement | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const reset = useCallback(() => {
    if (!mountedRef.current) return;
    setData(initialData);
    setPage(1);
    setLoading(false);
    setError(null);
    setHasMore(true);
    loadingRef.current = false;
  }, [initialData]);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore || !mountedRef.current) return;
    
    try {
      loadingRef.current = true;
      setLoading(true);
      setError(null);
      
      const result = await fetchData(page);
      
      if (!mountedRef.current) return;
      
      setData(prev => page === 1 ? result.data : [...prev, ...result.data]);
      setHasMore(result.hasMore);
      setPage(prev => prev + 1);
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err : new Error('Failed to fetch data'));
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
      loadingRef.current = false;
    }
  }, [fetchData, page, hasMore]);

  useEffect(() => {
    if (!lastElementRef.current || loading || !mountedRef.current) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loadingRef.current && mountedRef.current) {
          loadMore();
        }
      },
      { rootMargin: `${threshold}px` }
    );

    observer.observe(lastElementRef.current);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, loading, loadMore, threshold]);

  return {
    data,
    loading,
    error,
    hasMore,
    lastElementRef,
    reset
  };
} 