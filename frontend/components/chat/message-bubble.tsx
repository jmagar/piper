"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ExtendedChatMessage } from "@/types/chat";
import { AlertCircle, Check, Clock, Loader2 } from "lucide-react";

interface MessageBubbleProps {
  message: ExtendedChatMessage;
  className?: string;
  isLast?: boolean;
}

/**
 * Renders a single message bubble in the chat
 * Adapts styling based on the message role (user or assistant) and status
 */
export function MessageBubble({ message, className, /* isLast is unused */ }: MessageBubbleProps) {
  const isUser = message.role === "user";
  
  /**
   * Get status icon based on message status
   */
  const StatusIcon = React.useMemo(() => {
    switch (message.status) {
      case "sending":
        return <Clock className="h-3 w-3 text-muted-foreground" />;
      case "sent":
        return <Check className="h-3 w-3 text-success" />;
      case "delivered":
        return <Check className="h-3 w-3 text-success" />;
      case "error":
        return <AlertCircle className="h-3 w-3 text-destructive" />;
      case "streaming":
        return <Loader2 className="h-3 w-3 text-muted-foreground animate-spin" />;
      default:
        return null;
    }
  }, [message.status]);
  
  return (
    <div
      className={cn(
        "group relative flex w-full items-start gap-2 px-4",
        isUser ? "justify-end" : "justify-start",
        className
      )}
    >
      {/* Avatar or icon - only for assistant messages */}
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md bg-primary/10">
          <span className="text-sm font-medium text-primary">AI</span>
        </div>
      )}
      
      {/* Message bubble */}
      <div
        className={cn(
          "relative max-w-[85%] rounded-lg px-3 py-2 text-sm",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground",
          message.status === "error" && "border-destructive bg-destructive/10"
        )}
      >
        {/* Message content */}
        <div className="break-words">{message.content}</div>
        
        {/* Message metadata and status */}
        <div
          className={cn(
            "mt-1 flex items-center text-xs opacity-0 transition-opacity group-hover:opacity-100",
            isUser ? "justify-end" : "justify-start"
          )}
        >
          {/* Timestamp - format using relative time */}
          <span className="text-muted-foreground/70">
            {formatTimestamp(message.createdAt)}
          </span>
          
          {/* Status icon - only for user messages */}
          {isUser && StatusIcon && (
            <span className="ml-1.5 flex items-center">{StatusIcon}</span>
          )}
        </div>
        
        {/* Error message for failed messages */}
        {message.status === "error" && (
          <div className="mt-1 text-xs text-destructive">
            {typeof message.metadata?.error === "string"
              ? message.metadata.error
              : "Failed to send message"}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Format a timestamp into a human-readable format
 * Prefer relative time for recent messages, otherwise show date
 */
function formatTimestamp(timestamp: string | undefined): string {
  if (!timestamp) return "";
  
  try {
    const date = new Date(timestamp);
    
    // Invalid date
    if (isNaN(date.getTime())) return "";
    
    // For testing if more than 24 hours old
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Recent messages: show relative time
    if (date > yesterday) {
      return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(
        Math.round(
          (date.getTime() - now.getTime()) / (1000 * 60)
        ),
        "minute"
      );
    }
    
    // Older messages: show date
    return new Intl.DateTimeFormat("en", {
      hour: "numeric",
      minute: "numeric",
      month: "short",
      day: "numeric",
    }).formINDX( 	 .'           (   
  �       ��  O ~             Q	    	 � |     I	     y"]�z���:��z���:��