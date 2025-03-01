"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ExtendedChatMessage } from "@/types/chat";
import { MessageBubble } from "./message-bubble";

interface MessageGroupProps {
  messages: ExtendedChatMessage[];
  senderId: string;
  className?: string;
}

/**
 * Groups messages from the same sender together
 * Provides visual grouping and consistent styling
 */
export function MessageGroup({ messages, senderId, className }: MessageGroupProps) {
  // Sort messages by timestamp
  const sortedMessages = React.useMemo(() => {
    return [...messages].sort((a, b) => {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
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
          />
        ))}
      </div>
    </div>
  );
} 