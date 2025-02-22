'use client';

import { useState } from 'react';

import { formatDistanceToNow } from 'date-fns';
import { Bookmark, BookmarkCheck, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChatService } from '@/lib/generated/services/ChatService';
import { cn } from '@/lib/utils';
import type { ExtendedChatMessage } from '@/types/chat';

const DEFAULT_USER = {
  id: 'test-user-1',
  name: 'Test User',
  email: 'test@example.com'
} as const;

interface MessageCardProps {
  message: ExtendedChatMessage;
  className?: string;
  onUpdate?: (message: ExtendedChatMessage) => void;
}

function getMessageTimestamp(message: ExtendedChatMessage): Date {
  const timestamp = message.createdAt ?? message.metadata?.timestamp;
  
  if (!timestamp) {
    console.warn('No timestamp found for message:', message);
    return new Date();
  }
  
  try {
    return typeof timestamp === 'number' ? new Date(timestamp) : new Date(timestamp);
  } catch (err) {
    console.error('Failed to parse message timestamp:', err);
    return new Date();
  }
}

export function MessageCardV2({ message, className, onUpdate }: MessageCardProps) {
  const [isBookmarked, setIsBookmarked] = useState(message.metadata?.bookmarked ?? false);

  const handleBookmark = async () => {
    try {
      setIsBookmarked(!isBookmarked);
      
      if (isBookmarked) {
        await ChatService.prototype.unstarMessage({
          messageId: message.id,
          userId: DEFAULT_USER.id
        });
      } else {
        await ChatService.prototype.starMessage({
          messageId: message.id,
          userId: DEFAULT_USER.id
        });
      }
      
      onUpdate?.({
        ...message,
        metadata: {
          ...message.metadata,
          bookmarked: !isBookmarked
        }
      });
    } catch (err) {
      console.error('Failed to update bookmark:', err);
      toast.error('Failed to update bookmark');
      setIsBookmarked(isBookmarked);
    }
  };

  const handleCopyText = () => {
    if (!message.content) return;
    
    try {
      void navigator.clipboard.writeText(message.content);
      toast.success('Message copied to clipboard');
    } catch (err) {
      console.error('Failed to copy message:', err);
      toast.error('Failed to copy message');
    }
  };

  const isSystem = message.role === 'system';
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  return (
    <Card 
      className={cn(
        'p-4 transition-colors',
        isSystem && 'bg-[hsl(var(--muted))]/50 border-[hsl(var(--muted))]',
        isUser && 'bg-[hsl(var(--primary))]/10 ml-12',
        isAssistant && 'bg-[hsl(var(--secondary))]/10 mr-12',
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
            <span className="font-medium">
              {message.username ?? (isSystem ? 'System' : isAssistant ? 'Assistant' : 'You')}
            </span>
            <span>•</span>
            <span>
              {formatDistanceToNow(getMessageTimestamp(message), { addSuffix: true })}
            </span>
            {message.metadata?.edited ? (
              <>
                <span>•</span>
                <span className="italic">edited</span>
              </>
            ) : null}
          </div>
          <div className="mt-1 whitespace-pre-wrap text-[hsl(var(--foreground))]">
            {message.content}
          </div>
        </div>

        {isSystem ? null : (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => void handleBookmark()}
              className={cn(
                'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]',
                isBookmarked && 'text-[hsl(var(--foreground))]'
              )}
            >
              {isBookmarked ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleCopyText}>
                  Copy Text
                </DropdownMenuItem>
                <DropdownMenuItem>Edit Message</DropdownMenuItem>
                <DropdownMenuItem className="text-[hsl(var(--destructive))]">
                  Delete Message
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </Card>
  );
} 