import { ThumbsDown, ThumbsUp } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { MessageReaction } from '@/types/chat';

interface MessageReactionsProps {
  reactions: Record<string, MessageReaction>;
  onReact: (reaction: '👍' | '👎') => Promise<void>;
  onRemoveReaction: (reaction: '👍' | '👎') => Promise<void>;
  currentUserId: string;
  className?: string;
}

/**
 * A component that displays and handles message reactions (thumbs up/down)
 * @param reactions - The current reactions on the message
 * @param onReact - Callback when adding a reaction
 * @param onRemoveReaction - Callback when removing a reaction
 * @param currentUserId - The current user's ID to determine if they've reacted
 * @param className - Optional className for styling
 */
export function MessageReactions({
  reactions,
  onReact,
  onRemoveReaction,
  currentUserId,
  className
}: MessageReactionsProps) {
  const [isLoading, setIsLoading] = React.useState<string | null>(null);

  const handleReaction = async (emoji: '👍' | '👎') => {
    try {
      setIsLoading(emoji);
      const hasReacted = reactions[emoji]?.users.some(user => user.id === currentUserId);
      
      if (hasReacted) {
        await onRemoveReaction(emoji);
      } else {
        await onReact(emoji);
      }
    } catch (error) {
      console.error('Failed to handle reaction:', error);
    } finally {
      setIsLoading(null);
    }
  };

  const renderReactionButton = (emoji: '👍' | '👎', Icon: typeof ThumbsUp | typeof ThumbsDown) => {
    const reaction = reactions[emoji];
    const hasReacted = reaction?.users.some(user => user.id === currentUserId);
    const count = reaction?.count || 0;

    return (
      <Button
        variant={hasReacted ? 'secondary' : 'ghost'}
        size="icon"
        className={cn(
          'h-8 w-8 relative',
          hasReacted && 'bg-primary/10 hover:bg-primary/20',
          isLoading === emoji && 'opacity-50 cursor-not-allowed animate-pulse'
        )}
        onClick={() => void handleReaction(emoji)}
        disabled={isLoading !== null}
      >
        <Icon className={cn(
          'h-4 w-4 transition-transform duration-200',
          hasReacted && 'text-primary'
        )} />
        {count > 0 && (
          <span className={cn(
            'absolute -top-1 -right-1 min-w-[14px] h-[14px] text-[10px] rounded-full bg-primary/10 flex items-center justify-center',
            hasReacted && 'bg-primary text-primary-foreground'
          )}>{count}</span>
        )}
      </Button>
    );
  };

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {renderReactionButton('👍', ThumbsUp)}
      {renderReactionButton('👎', ThumbsDown)}
    </div>
  );
} 