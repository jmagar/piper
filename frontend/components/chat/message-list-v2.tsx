'use client';

import { useEffect, useRef } from 'react';

import { Loader2 } from 'lucide-react';
import { useInView } from 'react-intersection-observer';

import { cn } from '@/lib/utils';
import type { ExtendedChatMessage } from '@/types/chat';

import { MessageCardV2 as MessageCard } from './message-card-v2';

interface MessageListProps {
  messages: ExtendedChatMessage[];
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onMessageUpdate: (message: ExtendedChatMessage) => void;
}

export function MessageListV2({ 
  messages, 
  isLoading, 
  hasMore, 
  onLoadMore,
  onMessageUpdate 
}: MessageListProps) {
  const { ref: loadMoreRef, inView } = useInView();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load more messages when scrolling up
  useEffect(() => {
    if (inView && hasMore && !isLoading) {
      onLoadMore();
    }
  }, [inView, hasMore, isLoading, onLoadMore]);

  // Scroll to bottom on new message
  const lastMessage = messages[messages.length - 1];
  useEffect(() => {
    if (lastMessage?.status === 'sending') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [lastMessage?.status]);

  return (
    <div className="flex flex-col min-h-0 w-full">
      {/* Load more trigger */}
      {hasMore ? (
        <div ref={loadMoreRef} className="py-2 text-center">
          {isLoading ? (
            <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--muted-foreground))]" />
          ) : null}
        </div>
      ) : null}

      {/* Message list */}
      <div className="space-y-4">
        {messages.map(message => (
          <MessageCard
            key={message.id}
            message={message}
            className={cn(
              'w-full max-w-3xl mx-auto',
              message.role === 'assistant' ? "items-start" : "items-end"
            )}
            onUpdate={onMessageUpdate}
          />
        ))}
      </div>

      {/* Scroll anchor */}
      <div ref={messagesEndRef} />
    </div>
  );
} 