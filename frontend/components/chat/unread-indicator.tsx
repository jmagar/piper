import * as React from 'react';

import { cn } from '@/lib/utils';

interface UnreadIndicatorProps {
  count: number;
  className?: string;
  onClick?: () => void;
}

/**
 * A component that displays an unread message count indicator
 * @param count - Number of unread messages
 * @param className - Optional className for styling
 * @param onClick - Optional callback when indicator is clicked
 */
export function UnreadIndicator({ count, className, onClick }: UnreadIndicatorProps) {
  if (count === 0) return null;

  return (
    <button
      type="button"
      className={cn(
        'group flex items-center gap-2 rounded-full bg-primary px-3 py-1',
        'text-primary-foreground shadow-lg transition-all duration-200',
        'hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-2',
        'focus:ring-primary focus:ring-offset-2 animate-in fade-in-0',
        'slide-in-from-bottom-5 data-[count="1"]:slide-in-from-right-5',
        className
      )}
      onClick={onClick}
      data-count={count}
    >
      <span className="text-sm font-medium">
        {count} unread message{count !== 1 ? 's' : ''}
      </span>
      <div className="relative h-2 w-2">
        <div className="absolute h-full w-full animate-ping rounded-full bg-primary-foreground/50" />
        <div className="absolute h-full w-full rounded-full bg-primary-foreground" />
      </div>
    </button>
  );
} 