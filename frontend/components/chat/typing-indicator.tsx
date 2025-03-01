"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { TypingIndicator as TypingIndicatorType } from "@/types/chat";

interface TypingIndicatorProps {
  typingUsers?: TypingIndicatorType[];
  showNames?: boolean;
  className?: string;
}

/**
 * Displays an animated typing indicator when users are typing
 * Can optionally show the names of users who are typing
 */
export function TypingIndicator({
  typingUsers = [],
  showNames = true,
  className,
}: TypingIndicatorProps) {
  // Display different text based on number of typing users
  const typingText = React.useMemo(() => {
    if (!showNames) {
      return "Someone is typing...";
    }
    
    if (typingUsers.length === 1) {
      return `${typingUsers[0]?.username || 'Someone'} is typing...`;
    }
    
    if (typingUsers.length === 2) {
      return `${typingUsers[0]?.username || 'Someone'} and ${typingUsers[1]?.username || 'someone else'} are typing...`;
    }
    
    return `${typingUsers[0]?.username || 'Someone'} and ${typingUsers.length - 1} others are typing...`;
  }, [typingUsers, showNames]);
  
  // Skip rendering if no users are typing
  if (typingUsers.length === 0) {
    return null;
  }
  
  return (
    <div
      className={cn(
        "flex h-8 items-center space-x-2 text-xs text-muted-foreground",
        className
      )}
    >
      {/* Animated dots */}
      <div className="flex items-center space-x-1">
        <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/50 [animation-delay:0ms]" />
        <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/50 [animation-delay:150ms]" />
        <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/50 [animation-delay:300ms]" />
      </div>
      
      {/* Typing message */}
      <span>{typingText}</span>
    </div>
  );
} 