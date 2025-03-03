"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ExtendedChatMessage } from "@/types/chat";
import { MessageGroup } from "./message-group";
import { useIntersection } from "./hooks/use-intersection";
import { Loader2 } from "lucide-react";

interface MessageListProps {
  messages?: ExtendedChatMessage[];
  isLoading?: boolean;
  onLoadMore?: () => Promise<void>;
  className?: string;
}

/**
 * Displays a scrollable list of messages grouped by sender
 * Supports infinite scrolling with intersection observer
 */
export function MessageList({
  messages = [],
  isLoading = false,
  onLoadMore,
  className,
}: MessageListProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const scrollLockRef = React.useRef<boolean>(true);
  const [autoScroll, setAutoScroll] = React.useState(true);
  
  // Detect when user scrolls up to possibly load more messages
  const { ref: loadMoreRef, isIntersecting } = useIntersection("0px 0px 300px 0px");
  
  // Group messages by sender - with safety check
  const groupedMessages = React.useMemo(() => {
    // Ensure messages is an array before processing
    return Array.isArray(messages) ? groupMessagesBySender(messages) : {};
  }, [messages]);
  
  // Handle loading more messages when scrolling to top
  React.useEffect(() => {
    if (isIntersecting && !isLoading && onLoadMore) {
      onLoadMore();
    }
  }, [isIntersecting, isLoading, onLoadMore]);
  
  // Scroll to bottom when new messages come in (if auto-scroll is enabled)
  React.useEffect(() => {
    const container = containerRef.current;
    
    // Skip if container is not available or auto-scroll is disabled
    if (!container || !autoScroll) return;
    
    // Check if scroll is near bottom before scrolling to bottom
    const isNearBottom = 
      container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    
    if (isNearBottom || scrollLockRef.current) {
      // Scroll to bottom
      container.scrollTop = container.scrollHeight;
      scrollLockRef.current = false;
    }
  }, [messages, autoScroll]);
  
  // Handle scroll events to toggle auto-scroll
  const handleScroll = React.useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    
    // Check if user has scrolled up
    const isNearBottom = 
      target.scrollHeight - target.scrollTop - target.clientHeight < 100;
    
    setAutoScroll(isNearBottom);
  }, []);
  
  return (
    <div
      ref={containerRef}
      className={cn(
        "flex flex-col overflow-y-auto p-2 md:p-4 scroll-smooth",
        className
      )}
      onScroll={handleScroll}
    >
      {/* "Load more" trigger */}
      {onLoadMore && (
        <div ref={loadMoreRef} className="h-1 w-full">
          {isLoading && (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      )}
      
      {/* Welcome message for empty chats */}
      {!isLoading && messages.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
          <p className="mb-2 text-lg font-medium">Start a new conversation</p>
          <p className="text-sm">Type a message to begin chatting</p>
        </div>
      )}
      
      {/* Message groups */}
      {Object.entries(groupedMessages).map(([senderId, groupMessages]) => (
        <MessageGroup
          key={senderId}
          senderId={senderId}
          messages={groupMessages}
          className="mb-4"
        />
      ))}
      
      {/* Auto-scroll indicator */}
      {!autoScroll && (
        <button
          className="fixed bottom-20 right-4 rounded-full bg-primary p-2 text-primary-foreground shadow-md"
          onClick={() => {
            setAutoScroll(true);
            containerRef.current?.scrollTo({
              top: containerRef.current.scrollHeight,
              behavior: "smooth",
            });
          }}
          aria-label="Scroll to bottom"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
          >
            <path d="M12 19V5M5 12l7 7 7-7" />
          </svg>
        </button>
      )}
    </div>
  );
}

/**
 * Utility function to group messages by sender
 */
function groupMessagesBySender(messages: ExtendedChatMessage[]): Record<string, ExtendedChatMessage[]> {
  // Handle edge cases: null or undefined messages
  if (!Array.isArray(messages) || messages.length === 0) {
    return {};
  }
  
  return messages.reduce<Record<string, ExtendedChatMessage[]>>((groups, message) => {
    // Skip invalid messages
    if (!message) return groups;
    
    // Use unique ID for each user, or just role for a simpler grouping
    const key = message.userId || message.role || 'unknown';
    
    if (!groups[key]) {
      groups[key] = [];
    }
    
    groups[key].push(message);
    return groups;
  }, {});
} 