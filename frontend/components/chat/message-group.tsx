import { format, isSameDay, isWithinInterval, subMinutes } from 'date-fns';
import * as React from 'react';

import type { ExtendedChatMessage } from '@/types/chat';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { MessageCardV2 } from './message-card-v2';

interface MessageGroupProps {
  messages: ExtendedChatMessage[];
  className?: string;
  onMessageUpdate?: (message: ExtendedChatMessage) => void;
}

interface AvatarMetadata {
  url?: string;
}

interface PresenceMetadata {
  online?: boolean;
}

interface MessageMetadata {
  avatar?: AvatarMetadata;
  presence?: PresenceMetadata;
}

/**
 * Groups messages by user and time, showing avatars and timestamps appropriately
 * @param messages - Array of messages to group
 * @param className - Optional className for styling
 * @param onMessageUpdate - Callback when a message is updated
 */
export function MessageGroup({ messages, className, onMessageUpdate }: MessageGroupProps) {
  if (!messages.length) return null;

  const firstMessage = messages[0];

  // Get user info from first message
  const username = firstMessage.username;
  const isSystem = firstMessage.role === 'system';
  const isAssistant = firstMessage.role === 'assistant';

  // Format timestamps
  const firstTimestamp = new Date(firstMessage.createdAt);
  const showDate = !isSameDay(new Date(), firstTimestamp);

  // Get avatar info
  const metadata = firstMessage.metadata as MessageMetadata | undefined;
  const avatarUrl = metadata?.avatar?.url;
  const avatarFallback = username?.[0]?.toUpperCase() ?? (isSystem ? 'S' : isAssistant ? 'A' : 'U');
  const isOnline = metadata?.presence?.online ?? false;

  return (
    <div className={cn(
      'flex gap-2 sm:gap-4',
      'transition-all duration-200',
      'hover:bg-accent/5',
      className
    )}>
      <div className="flex flex-col items-center gap-1 sm:gap-2">
        <Avatar online={isOnline} className="h-8 w-8 sm:h-10 sm:w-10">
          {avatarUrl ? (
            <AvatarImage src={avatarUrl} alt={username ?? 'User avatar'} />
          ) : (
            <AvatarFallback>{avatarFallback}</AvatarFallback>
          )}
        </Avatar>
        {showDate && (
          <time
            dateTime={firstTimestamp.toISOString()}
            className="hidden text-xs text-muted-foreground sm:block"
          >
            {format(firstTimestamp, 'MMM d')}
          </time>
        )}
      </div>
      <div className="flex-1 space-y-1 sm:space-y-2">
        {messages.map((message, index) => {
          const prevMessage = messages[index - 1];
          const nextMessage = messages[index + 1];
          
          // Check if message should be grouped
          const isFirstInGroup = !prevMessage || !isWithinInterval(
            new Date(message.createdAt),
            {
              start: subMinutes(new Date(prevMessage.createdAt), 2),
              end: new Date(prevMessage.createdAt)
            }
          );

          const isLastInGroup = !nextMessage || !isWithinInterval(
            new Date(nextMessage.createdAt),
            {
              start: new Date(message.createdAt),
              end: subMinutes(new Date(nextMessage.createdAt), 2)
            }
          );

          return (
            <MessageCardV2
              key={message.id}
              message={message}
              showHeader={isFirstInGroup}
              isPartOfGroup={!isLastInGroup}
              onUpdate={onMessageUpdate}
              className="sm:hover:translate-x-1"
            />
          );
        })}
      </div>
    </div>
  );
} 