"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ExtendedChatMessage } from "@/types/chat";
import { 
  AlertCircle, 
  Check, 
  Clock, 
  Loader2, 
  ThumbsUp, 
  ThumbsDown, 
  Copy, 
  Star, 
  Edit, 
  RefreshCw 
} from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Props for the message bubble component
 */
interface MessageBubbleProps {
  message: ExtendedChatMessage;
  className?: string;
  isLast?: boolean;
  onEdit?: (messageId: string, content: string) => void;
  onRegenerate?: (messageId: string) => void;
}

/**
 * Formats message content, handling code blocks and line breaks
 */
function formatMessageContent(content: string): React.ReactNode {
  if (!content) return null;
  
  // Split by code blocks
  const parts = content.split(/(```[a-z]*\n[\s\S]*?\n```)/g);
  
  return (
    <>
      {parts.map((part, index) => {
        // Check if this part is a code block
        if (part.startsWith("```") && part.endsWith("```")) {
          // Extract language (if specified) and code content
          const match = part.match(/```([a-z]*)\n([\s\S]*?)\n```/);
          if (match) {
            const [, language, code] = match;
            return (
              <div key={index} className="my-3 overflow-hidden rounded-md bg-secondary">
                {language && (
                  <div className="bg-muted px-4 py-1 text-xs font-medium text-muted-foreground">
                    {language}
                  </div>
                )}
                <pre className="p-4 relative group">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => {
                      if (code) {
                        navigator.clipboard.writeText(code);
                      }
                    }}
                    aria-label="Copy code"
                    title="Copy code"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <code>{code}</code>
                </pre>
              </div>
            );
          }
        }
        
        // Handle regular text with line breaks
        return (
          <p key={index} className="whitespace-pre-wrap">
            {part}
          </p>
        );
      })}
    </>
  );
}

/**
 * Message bubble component for chat messages
 */
export function MessageBubble({ 
  message, 
  className,
  onEdit,
  onRegenerate 
}: MessageBubbleProps) {
  // Determine if message is from user
  const isUserMessage = message.role === "user";
  
  // Reactions state
  const [isHovered, setIsHovered] = React.useState(false);
  const [reaction, setReaction] = React.useState<'up' | 'down' | null>(
    message.metadata?.reaction ? message.metadata.reaction : null
  );
  const [isStarred, setIsStarred] = React.useState<boolean>(
    message.metadata?.starred || false
  );
  
  // Handle reactions
  const handleReaction = (type: 'up' | 'down') => {
    setReaction(prev => prev === type ? null : type);
    // Here you would also send the reaction to the server
    console.log(`Reacted ${type} to message ${message.id}`);
  };
  
  // Handle starring
  const handleStar = () => {
    setIsStarred(prev => !prev);
    // Here you would also send the star update to the server
    console.log(`${isStarred ? 'Unstarred' : 'Starred'} message ${message.id}`);
  };
  
  // Handle copying message content
  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    console.log(`Copied message ${message.id}`);
  };

  // Handle edit message
  const handleEdit = () => {
    if (onEdit) {
      onEdit(message.id, message.content);
    } else {
      console.log(`Edit message ${message.id}`);
    }
  };

  // Handle regenerate message
  const handleRegenerate = () => {
    if (onRegenerate) {
      onRegenerate(message.id);
    } else {
      console.log(`Regenerate message ${message.id}`);
    }
  };
  
  // Status indicator component based on message status
  const StatusIndicator = () => {
    switch (message.status) {
      case "sending":
        return <Clock className="ml-2 h-4 w-4 text-zinc-500" />;
      case "streaming":
        return <Loader2 className="ml-2 h-4 w-4 animate-spin text-zinc-500" />;
      case "error":
        return <AlertCircle className="ml-2 h-4 w-4 text-red-500" />;
      case "sent":
      case "delivered":
        return <Check className="ml-2 h-4 w-4 text-green-500" />;
      default:
        return null;
    }
  };
  
  return (
    <div
      className={cn(
        "flex w-full items-start gap-2 px-4 py-3",
        isUserMessage ? "justify-end" : "justify-start",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={cn("flex max-w-[85%] flex-col relative")}>
        {/* Message header with role and status */}
        <div
          className={cn(
            "mb-1 flex items-center",
            isUserMessage ? "justify-end" : "justify-start"
          )}
        >
          <div className="text-sm font-medium">
            {isUserMessage ? "You" : "Assistant"}
          </div>
          <StatusIndicator />
        </div>
        
        {/* Message content */}
        <div
          className={cn(
            "rounded-lg px-4 py-2 shadow-sm",
            isUserMessage
              ? "bg-blue-600 text-white" // Blue for user messages
              : "bg-surface-raised text-foreground" // Default surface for assistant
          )}
        >
          {formatMessageContent(message.content)}
        </div>
        
        {/* Message timestamp and reactions */}
        <div
          className={cn(
            "mt-1 flex items-center",
            isUserMessage ? "justify-end" : "justify-start"
          )}
        >
          <span className="text-xs text-zinc-500">
            {new Date(message.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          
          {/* User message actions */}
          {isUserMessage && isHovered && (
            <div className="ml-2 flex items-center space-x-1 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-full"
                onClick={handleEdit}
                aria-label="Edit message"
                title="Edit message"
              >
                <Edit className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
          
          {/* Assistant message actions */}
          {!isUserMessage && (
            <div 
              className={cn(
                "ml-2 flex items-center space-x-1 transition-opacity",
                isHovered ? "opacity-100" : "opacity-0"
              )}
            >
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-6 w-6 rounded-full",
                  reaction === 'up' && "text-green-500"
                )}
                onClick={() => handleReaction('up')}
                aria-label="Thumbs up"
                title="Helpful response"
              >
                <ThumbsUp className="h-3.5 w-3.5" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-6 w-6 rounded-full",
                  reaction === 'down' && "text-red-500"
                )}
                onClick={() => handleReaction('down')}
                aria-label="Thumbs down"
                title="Not helpful"
              >
                <ThumbsDown className="h-3.5 w-3.5" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-full"
                onClick={handleCopy}
                aria-label="Copy message"
                title="Copy message"
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-6 w-6 rounded-full",
                  isStarred && "text-yellow-400"
                )}
                onClick={handleStar}
                aria-label={isStarred ? "Remove star" : "Star"}
                title={isStarred ? "Remove from starred" : "Add to starred messages"}
              >
                <Star className="h-3.5 w-3.5" fill={isStarred ? "currentColor" : "none"} />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-full"
                onClick={handleRegenerate}
                aria-label="Regenerate response"
                title="Regenerate response"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 