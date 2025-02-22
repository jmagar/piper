"use client"

import * as React from "react"

import { Search, SortAsc, SortDesc } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export interface FilterSortOptions {
  search: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

interface FilterSortProps {
  onFilterChange: (options: FilterSortOptions) => void;
  sortOptions: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
}

export function FilterSort({
  onFilterChange,
  sortOptions,
  placeholder = "Search...",
  className = ""
}: FilterSortProps) {
  // Use reducer for more predictable state updates
  const [state, dispatch] = React.useReducer(
    (state: FilterSortOptions, action: Partial<FilterSortOptions>) => ({
      ...state,
      ...action
    }),
    {
      search: "",
      sortBy: sortOptions[0]?.value || "",
      sortOrder: 'desc'
    }
  );

  // Store the callback in a ref to prevent unnecessary effects
  const onFilterChangeRef = React.useRef(onFilterChange);
  React.useEffect(() => {
    onFilterChangeRef.current = onFilterChange;
  }, [onFilterChange]);

  // Debounced notification of state changes
  React.useEffect(() => {
    try {
      const timeoutId = setTimeout(() => {
        if (onFilterChangeRef.current) {
          onFilterChangeRef.current(state);
        }
      }, 300);

      return () => clearTimeout(timeoutId);
    } catch (error) {
      console.error('Error in filter change:', error);
    }
  }, [state]);

  // Memoize the event handlers
  const handleSearchChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ search: e.target.value });
  }, []);

  const handleSortByChange = React.useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    dispatch({ sortBy: e.target.value });
  }, []);

  const handleSortOrderToggle = React.useCallback(() => {
    dispatch({ sortOrder: state.sortOrder === 'asc' ? 'desc' : 'asc' });
  }, [state.sortOrder]);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative flex-1">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          value={state.search}
          onChange={handleSearchChange}
          className="pl-8"
        />
      </div>
      <select
        value={state.sortBy}
        onChange={handleSortByChange}
        className="h-10 w-[180px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        {sortOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <Button
        variant="outline"
        size="icon"
        onClick={handleSortOrderToggle}
        className="w-10"
      >
        {state.sortOrder === 'asc' ? (
          <SortAsc className="h-4 w-4" />
        ) : (
          <SortDesc className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
} 