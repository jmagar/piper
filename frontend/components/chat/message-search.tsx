import * as React from 'react';

import { Search, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { ExtendedChatMessage } from '@/types/chat';

interface MessageSearchProps {
  messages: ExtendedChatMessage[];
  onMessageSelect: (messageId: string) => void;
  className?: string;
}

/**
 * A component that provides message search functionality with highlighted results
 * @param messages - Array of messages to search through
 * @param onMessageSelect - Callback when a message is selected
 * @param className - Optional className for styling
 */
export function MessageSearch({ messages, onMessageSelect, className }: MessageSearchProps) {
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<ExtendedChatMessage[]>([]);
  const [selectedIndex, setSelectedIndex] = React.useState(-1);

  const handleSearch = React.useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setSelectedIndex(-1);
      return;
    }

    const searchResults = messages.filter(message => {
      const content = message.content?.toLowerCase() ?? '';
      const username = message.username?.toLowerCase() ?? '';
      const searchLower = searchQuery.toLowerCase();
      
      return content.includes(searchLower) || username.includes(searchLower);
    });

    setResults(searchResults);
    setSelectedIndex(searchResults.length > 0 ? 0 : -1);
  }, [messages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && results[selectedIndex]) {
        onMessageSelect(results[selectedIndex].id);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(0, prev - 1));
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(results.length - 1, prev + 1));
    }
  };

  const highlightText = (text: string, searchQuery: string) => {
    if (!searchQuery.trim()) return text;

    const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));
    return parts.map((part, i) => (
      part.toLowerCase() === searchQuery.toLowerCase() ? (
        <mark key={i} className="bg-yellow-200 dark:bg-yellow-800">{part}</mark>
      ) : part
    ));
  };

  React.useEffect(() => {
    handleSearch(query);
  }, [query, handleSearch]);

  return (
    <div className={cn('flex flex-col', className)}>
      <div className="relative">
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search messages..."
          className="pr-8"
        />
        {query && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-full"
            onClick={() => setQuery('')}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      {results.length > 0 && (
        <ScrollArea className="mt-2 h-[300px] rounded-md border">
          <div className="p-4 space-y-4">
            {results.map((message, index) => (
              <button
                key={message.id}
                className={cn(
                  'w-full text-left p-2 rounded hover:bg-accent',
                  index === selectedIndex && 'bg-accent'
                )}
                onClick={() => {
                  setSelectedIndex(index);
                  onMessageSelect(message.id);
                }}
              >
                <div className="flex items-center gap-2 text-sm">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">
                    {message.username ?? 'Unknown User'}
                  </span>
                  <span className="text-muted-foreground">
                    said:
                  </span>
                </div>
                <div className="mt-1 text-sm line-clamp-2">
                  {highlightText(message.content ?? '', query)}
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
} 