'use client';

import * as React from 'react';

import { Loader2 } from 'lucide-react';
import { useInView } from 'react-intersection-observer';

import { cn } from '@/lib/utils';
import type { ExtendedChatMessage } from '@/types/chat';

import { MessageGroup } from './message-group';

interface MessageListProps {
  messages: ExtendedChatMessage[];
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onMessageUpdate: (_: ExtendedChatMessage) => void;
}

/**
 * Groups messages by sender and adds timestamps between groups
 */
function groupMessages(messages: ExtendedChatMessage[]): ExtendedChatMessage[][] {
  const groups: ExtendedChatMessage[][] = [];
  let currentGroup: ExtendedChatMessage[] = [];

  messages.forEach((message, index) => {
    const prevMessage = messages[index - 1];

    // Start a new group if:
    // 1. This is the first message
    // 2. The sender changed
    // 3. The time gap is more than 5 minutes
    // 4. The previous message was a system message
    // 5. This message is a system message
    const shouldStartNewGroup = 
      !prevMessage || 
      prevMessage.role !== message.role ||
      prevMessage.userId !== message.userId ||
      Math.abs(new Date(message.createdAt).getTime() - new Date(prevMessage.createdAt).getTime()) > 5 * 60 * 1000 ||
      prevMessage.role === 'system' ||
      message.role === 'system';

    if (shouldStartNewGroup) {
      if (currentGroup.length > 0) {
        groups.push(currentGroup);
      }
      currentGroup = [message];
    } else {
      currentGroup.push(message);
    }
  });

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
}

export function MessageListV2({ 
  messages, 
  isLoading, 
  hasMore, 
  onLoadMore,
  onMessageUpdate 
}: MessageListProps) {
  const { ref: loadMoreRef, inView } = useInView();
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // Group messages by sender
  const messageGroups = React.useMemo(() => groupMessages(messages), [messages]);

  // Load more messages when scrolling up
  React.useEffect(() => {
    if (inView && hasMore && !isLoading) {
      onLoadMore();
    }
  }, [inView, hasMore, isLoading, onLoadMore]);

  // Scroll to bottom on new message
  const lastMessage = messages[messages.length - 1];
  React.useEffect(() => {
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

      {/* Message groups */}
      <div className="space-y-6">
        {messageGroups.map((group) => {
          const first = group[0];
          if (!first) return null;

          return (
            <MessageGroup
              key={first.id}
              messages={group}
              className={cn(
                'w-full max-w-3xl mx-auto',
                first.role === 'assistant' ? "items-start" : "items-end"
              )}
              onMessageUpdate={onMessageUpdate}
            />
          );
        })}
      </div>

      {/* Scroll anchor */}
      <div ref={messagesEndRef} />
    </div>
  );
} 