import { useCallback, useState } from 'react';

import { Search } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/use-debounce';
import { cn } from '@/lib/utils';

interface SearchBoxProps {
  /** Callback function when search query changes */
  onSearch?: (arg0: string) => void;
  placeholder?: string;
  className?: string;
  debounceMs?: number;
}

/**
 * A reusable search box component with debounced input
 * @param onSearch - Callback function when search query changes
 * @param placeholder - Placeholder text for the input
 * @param className - Additional CSS classes
 * @param debounceMs - Debounce delay in milliseconds
 */
export function SearchBox({
  onSearch,
  placeholder = 'Search...',
  className,
  debounceMs = 300
}: SearchBoxProps) {
  const [query, setQuery] = useState('');
  
  const debouncedSearch = useDebounce((value: string) => {
    onSearch?.(value);
  }, debounceMs);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    debouncedSearch(value);
  }, [debouncedSearch]);

  return (
    <div className={cn('relative flex-1', className)}>
      <Search className="absolute left-2 top-2.5 h-4 w-4 text-[hsl(var(--muted-foreground))] pointer-events-none" />
      <Input
        type="search"
        placeholder={placeholder}
        value={query}
        onChange={handleChange}
        className="pl-8 w-full"
        aria-label="Search"
      />
    </div>
  );
} 