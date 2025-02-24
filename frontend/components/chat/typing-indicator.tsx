import * as React from 'react';

import { cn } from '@/lib/utils';

interface TypingIndicatorProps {
  className?: string;
  username?: string;
}

/**
 * A component that shows an animated typing indicator
 * @param className - Optional className for styling
 * @param username - Username of the person typing (optional)
 */
export function TypingIndicator({ className, username }: TypingIndicatorProps) {
  return (
    <div className={cn('flex items-center gap-2 text-sm text-muted-foreground', className)}>
      {username && <span className="font-medium">{username} is typing</span>}
      <div className="flex items-center gap-1">
        <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" style={{ animationDelay: '0ms' }} />
        <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" style={{ animationDelay: '150ms' }} />
        <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
} 