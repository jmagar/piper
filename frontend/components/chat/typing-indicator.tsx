"use client";

import * as React from 'react';
import { TypingUser } from '@/hooks/use-typing-indicator';
import { cn } from '@/lib/utils';

interface TypingIndicatorProps {
  users: TypingUser[];
  className?: string;
}

/**
 * Component that displays typing indicators for active users
 * Shows animated dots and usernames of people currently typing
 */
export function TypingIndicator({ users, className }: TypingIndicatorProps) {
  if (!users.length) return null;
  
  return (
    <div className={cn(
      "p-2 text-sm text-muted-foreground opacity-70 transition-opacity",
      className
    )}>
      {users.map((user) => (
        <div key={user.userId} className="flex items-center gap-1">
          <span className="font-medium">{user.username}</span>
          <span className="text-xs">is typing</span>
          <span className="inline-flex">
            <span className="animate-bounce">.</span>
            <span className="animate-bounce animation-delay-200">.</span>
            <span className="animate-bounce animation-delay-400">.</span>
          </span>
        </div>
      ))}
    </div>
  );
} 