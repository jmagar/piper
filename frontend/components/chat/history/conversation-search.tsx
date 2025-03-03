"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Search, X } from "lucide-react";

/**
 * ConversationSearch component props
 */
interface ConversationSearchProps {
  /** Current search query */
  value: string;
  /** Callback for when search query changes */
  onChange: (value: string) => void;
  /** Optional additional className */
  className?: string;
  /** Placeholder text */
  placeholder?: string;
}

/**
 * Search component for filtering conversations
 * Provides real-time filtering as the user types
 * 
 * @example
 * ```tsx
 * <ConversationSearch 
 *   value={searchQuery} 
 *   onChange={setSearchQuery}
 *   placeholder="Search conversations..."
 * />
 * ```
 */
export function ConversationSearch({
  value,
  onChange,
  className,
  placeholder = "Search conversations..."
}: ConversationSearchProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Focus input on key press (when not already focused on an input)
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Skip if we're already focused on an input or textarea
      if (
        document.activeElement &&
        (document.activeElement.tagName === "INPUT" ||
          document.activeElement.tagName === "TEXTAREA")
      ) {
        return;
      }
      
      // If user presses '/' key, focus the search input
      if (e.key === "/") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div
      className={cn(
        "relative flex items-center transition-all",
        className
      )}
    >
      <Search
        className="absolute left-2.5 h-4 w-4 text-[hsl(var(--muted-foreground))]"
        aria-hidden="true"
      />
      
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "h-9 w-full rounded-md border border-[hsl(var(--border))] bg-transparent px-8",
          "text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]",
          "focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))]",
          "disabled:cursor-not-allowed disabled:opacity-50"
        )}
        spellCheck={false}
      />
      
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-2.5 flex h-4 w-4 items-center justify-center rounded-full text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
          aria-label="Clear search"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}