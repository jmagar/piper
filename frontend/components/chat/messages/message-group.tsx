"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ExtendedChatMessage } from "@/types/chat";
import { MessageBubble } from "./message-bubble";

interface MessageGroupProps {
  messages: ExtendedChatMessage[];
  senderId: string;
  className?: string;
  onEdit?: (messageId: string, content: string) => void;
  onRegenerate?: (messageId: string) => void;
  onStar?: (messageId: string, isStarred: boolean) => void;
  onReact?: (messageId: string, reaction: 'up' | 'down') => void;
}

/**
 * Groups messages from the same sender together
 * Provides visual grouping and consistent styling
 */
export function MessageGroup({ 
  messages, 
  senderId, 
  className,
  onEdit,
  onRegenerate,
  onStar,
  onReact
}: MessageGroupProps) {
  // Sort messages by timestamp
  const sortedMessages = React.useMemo(() => {
    return [...messages].sort((a, b) => {
      const timeA = new Date(a.metadata?.timestamp || a.createdAt).getTime();
      const timeB = new Date(b.metadata?.timestamp || b.createdAt).getTime();
      return timeA - timeB;
    });
  }, [messages]);
  
  if (!messages.length) return null;
  
  // Role of the message sender
  const role = messages[0]?.role || 'unknown';
  
  // Whether this group is from the user or assistant
  const isUser = role === "user";
  
  return (
    <div
      className={cn(
        "flex flex-col gap-2 py-2",
        isUser ? "items-end" : "items-start",
        className
      )}
    >
      {/* Group heading - can include user name for multi-user chats */}
      {!isUser && (
        <div className="px-4 text-xs font-medium text-muted-foreground">
          {messages[0]?.username || "Assistant"}
        </div>
      )}
      
      {/* Message bubbles */}
      <div className="flex w-full flex-col gap-1">
        {sortedMessages.map((message, index) => (
          <MessageBubble
            key={message.id}
            message={message}
            isLast={index === sortedMessages.length - 1}
            onEdit={onEdit && role === 'user' ? 
              (id, content) => onEdit(id, content) : undefined}
            onRegenerate={onRegenerate && role === 'assistant' ? 
              (id) => onRegenerate(id) : undefined}
            onStar={onStar ? 
              (isStarred) => onStar(message.id, isStarred) : undefined}
            onReact={onReact && role === 'assistant' ? 
              (reaction) => onReact(message.id, reaction) : undefined}
          />
        ))}
      </div>
    </div>
  );
} 