"use client";

import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { ExtendedChatMessage } from '@/types/chat';
import { ChatMessage } from '@/components/chat/messages/chat-message';
import { cn } from '@/lib/utils';
import { useIntersection } from '../hooks/use-intersection';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronDown, RefreshCw, AlertCircle } from 'lucide-react';
import { traceMessage } from '../chat-debug';

// Error boundary for the entire message list
class MessageListErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('Error in MessageList:', error, errorInfo);
    traceMessage('message-list', 'error:boundary', { error: error.message });
  }

  override render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 h-full">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <h3 className="text-lg font-semibold text-red-800 mb-2">Message Display Error</h3>
            <p className="text-sm text-red-700 mb-4">
              {this.state.error?.message || "There was a problem displaying your messages."}
            </p>
            <Button 
              onClick={() => this.setState({ hasError: false, error: null })}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <RefreshCw className="h-4 w-4 mr-2" /> Try Again
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Props for the ChatMessagesList component
 */
interface ChatMessagesListProps {
  /**
   * The list of messages to display
   */
  messages: ExtendedChatMessage[];
  
  /**
   * Whether to show a loading indicator
   */
  isLoading?: boolean;
  
  /**
   * Called when the user wants to load more messages
   */
  onLoadMore?: () => Promise<void>;
  
  /**
   * Called when a message is edited
   */
  onEditMessage?: (messageId: string) => void;
  
  /**
   * Called when a message reaction is toggled
   */
  onReactToMessage?: (messageId: string, reaction: 'up' | 'down') => void;
  
  /**
   * Called when a message is starred
   */
  onStarMessage?: (messageId: string, starred: boolean) => void;
  
  /**
   * Called when the user wants to regenerate an assistant response
   */
  onRegenerateMessage?: () => void;
  
  /**
   * Additional CSS classes to apply to the component
   */
  className?: string;
}

/**
 * Component that displays a list of chat messages with auto-scrolling and error handling
 */
export function ChatMessagesList({
  messages = [],
  isLoading = false,
  onLoadMore,
  onEditMessage,
  onReactToMessage,
  onStarMessage,
  onRegenerateMessage,
  className
}: ChatMessagesListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  
  // Log received messages for debugging
  useEffect(() => {
    traceMessage('messages-list', 'received-messages', { count: messages.length });
  }, [messages.length]);
  
  // Auto-scroll to bottom when messages change or loading state changes
  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, autoScroll]);
  
  // Handle scrolling to the bottom
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
    setAutoScroll(true);
  };
  
  // Handle loading more messages
  const handleLoadMore = async () => {
    if (onLoadMore && !isLoadingMore) {
      setIsLoadingMore(true);
      try {
        await onLoadMore();
      } finally {
        setIsLoadingMore(false);
      }
    }
  };
  
  // Check if we're near the bottom of the chat
  const { ref } = useIntersection({
    threshold: 0.5,
    onChange: (isNearBottom) => {
      setAutoScroll(isNearBottom);
      setShowScrollButton(!isNearBottom);
    },
    rootMargin: "0px"
  });
  
  // Handle special cases like empty state
  if (!messages || messages.length === 0) {
    return (
      <div className={cn(
        "flex flex-1 flex-col items-center justify-center p-8",
        className
      )}>
        <p className="text-center text-muted-foreground">
          No messages yet. Start a conversation!
        </p>
      </div>
    );
  }
  
  // Main message list rendering
  return (
    <MessageListErrorBoundary>
      <div className={cn(
        "relative flex flex-col gap-3 overflow-y-auto px-4 py-3",
        className
      )}
      data-message-count={messages.length}>
        {/* Load more button */}
        {onLoadMore && (
          <div className="flex justify-center py-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLoadMore}
              disabled={isLoadingMore}
            >
              {isLoadingMore ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                'Load more'
              )}
            </Button>
          </div>
        )}
        
        {/* Message list */}
        {messages.map((message, index) => (
          <ChatMessage
            key={message.id || index}
            message={message}
            isLastMessage={index === messages.length - 1}
            showAvatar={true}
            onEdit={onEditMessage ? () => onEditMessage(message.id) : undefined}
            onReact={onReactToMessage ? (reaction: 'up' | 'down') => onReactToMessage(message.id, reaction) : undefined}
            onStar={onStarMessage ? (starred: boolean) => onStarMessage(message.id, starred) : undefined}
            onRegenerate={index === messages.length - 1 && message.role === 'assistant' && onRegenerateMessage ? 
              onRegenerateMessage : undefined}
          />
        ))}
        
        {/* Loading indicator */}
        {isLoading && !messages.some(m => m.status === 'streaming') && (
          <div className="flex items-center justify-start space-x-2 animate-pulse">
            <div className="h-8 w-8 rounded-full bg-muted"></div>
            <div className="space-y-2">
              <div className="h-4 w-32 rounded bg-muted"></div>
            </div>
          </div>
        )}
        
        {/* Bottom reference for auto-scrolling */}
        <div ref={messagesEndRef} />
        <div ref={ref} className="h-px" />
        
        {/* Scroll to bottom button */}
        {showScrollButton && (
          <Button
            className="absolute bottom-4 right-4 rounded-full p-2 shadow-lg"
            size="icon"
            onClick={scrollToBottom}
            aria-label="Scroll to bottom"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        )}
      </div>
    </MessageListErrorBoundary>
  );
} 