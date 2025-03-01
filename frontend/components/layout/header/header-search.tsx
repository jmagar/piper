"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Search as SearchIcon } from "lucide-react";
// import { Input } from "@/components-v2/ui/input";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useRouter } from "next/navigation";

interface HeaderSearchProps {
  /**
   * Optional additional className for the component
   */
  className?: string;
  
  /**
   * Callback fired when a search is complete or canceled
   */
  onSearch?: () => void;
}

/**
 * Global search component with command palette integration
 * 
 * This component provides a unified search experience with keyboard
 * shortcuts and command palette functionality.
 * 
 * @example
 * ```tsx
 * <HeaderSearch onSearch={() => console.log('Search completed')} />
 * ```
 */
export function HeaderSearch({ className, onSearch }: HeaderSearchProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  
  // Handle keyboard shortcut to open search
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Open search with Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
      }
    };
    
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);
  
  // Reset search when dialog closes
  React.useEffect(() => {
    if (!isOpen) {
      setTimeout(() => setSearch(""), 200);
    }
  }, [isOpen]);
  
  // Handle selecting a search result
  const handleSelect = (value: string) => {
    setIsOpen(false);
    router.push(value);
    onSearch?.();
  };
  
  return (
    <>
      <Button
        variant="outline"
        className={cn(
          "relative h-9 w-9 md:h-10 md:w-60 md:justify-start md:px-3 md:py-2",
          className
        )}
        onClick={() => setIsOpen(true)}
        aria-label="Search"
      >
        <SearchIcon className="h-4 w-4 md:mr-2" />
        <span className="hidden md:inline-flex">Search...</span>
        <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      
      <CommandDialog open={isOpen} onOpenChange={setIsOpen}>
        <CommandInput 
          placeholder="Search for chats, settings, or help..." 
          value={search}
          onValueChange={setSearch}
        />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          
          <CommandGroup heading="Recent Chats">
            {/* Example recent chats, would be dynamic in real implementation */}
            <CommandItem onSelect={() => handleSelect("/chat/recent-1")}>
              Recent Chat 1
            </CommandItem>
            <CommandItem onSelect={() => handleSelect("/chat/recent-2")}>
              Recent Chat 2
            </CommandItem>
          </CommandGroup>
          
          <CommandGroup heading="Quick Navigation">
            <CommandItem onSelect={() => handleSelect("/chat/new")}>
              New Chat
            </CommandItem>
            <CommandItem onSelect={() => handleSelect("/settings")}>
              Settings
            </CommandItem>
            <CommandItem onSelect={() => handleSelect("/profile")}>
              Profile
            </CommandItem>
          </CommandGroup>
          
          <CommandGroup heading="Help">
            <CommandItem onSelect={() => handleSelect("/help")}>
              Help Center
            </CommandItem>
            <CommandItem onSelect={() => handleSelect("/keyboard-shortcuts")}>
              Keyboard Shortcuts
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
} 