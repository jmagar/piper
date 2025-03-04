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
  RefreshCw,
  MoreVertical
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from 'date-fns';

/**
 * Props for the message bubble component
 */
interface MessageBubbleProps {
  message: ExtendedChatMessage;
  className?: string | undefined;
  isLast?: boolean | undefined;
  onEdit?: ((messageId: string, content: string) => void) | undefined;
  onRegenerate?: ((messageId: string) => void) | undefined;
  onStar?: ((isStarred: boolean) => void) | undefined;
  onReact?: ((reaction: 'up' | 'down') => void) | undefined;
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
            {part.split('\n').map((line, lineIndex) => {
              // Make sure each line is properly rendered
              return (
                <React.Fragment key={`line-${lineIndex}`}>
                  {line}
                  {lineIndex < part.split('\n').length - 1 && <br />}
                </React.Fragment>
              );
            })}
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
  onRegenerate,
  onStar,
  onReact
}: MessageBubbleProps) {
  // Determine if message is from user
  const isUserMessage = message.role === "user";
  const isAssistant = message.role === "assistant";
  
  // Reactions state
  const [isHovered, setIsHovered] = React.useState(false);
  const [reaction, setReaction] = React.useState<'up' | 'down' | null>(
    message.metadata?.reaction ? message.metadata.reaction : null
  );
  const [isStarred, setIsStarred] = React.useState<boolean>(
    message.metadata?.starred || false
  );
  const [isCopied, setIsCopied] = React.useState<boolean>(false);
  
  // Handle reactions
  const handleReaction = (type: 'up' | 'down') => {
    const newReaction = reaction === type ? null : type;
    setReaction(newReaction);
    
    if (onReact) {
      onReact(type);
    }
  };
  
  // Handle starring
  const handleStar = () => {
    const newStarred = !isStarred;
    setIsStarred(newStarred);
    
    if (onStar) {
      onStar(newStarred);
    }
  };
  
  // Handle copying message content
  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Handle edit message
  const handleEdit = () => {
    if (onEdit) {
      onEdit(message.id, message.content);
    }
  };

  // Handle regenerate message
  const handleRegenerate = () => {
    if (onRegenerate) {
      onRegenerate(message.id);
    }
  };
  
  // Status indicator component based on message status
  const StatusIndicator = () => {
    // Get status from message 
    const status = message.status;
    
    switch (status) {
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
  
  // Get timestamp string
  const timestamp = message.metadata?.timestamp || message.createdAt;
  const timeString = timestamp 
    ? format(new Date(timestamp), 'HH:mm')
    : '';
  
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
      <div className={cn(
        "flex max-w-[85%] flex-col relative",
        // Increase max width for assistant messages to prevent truncation
        !isUserMessage && "max-w-[90%] md:max-w-[95%]"
      )}>
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
              : "bg-surface-raised text-foreground break-words", // Added break-words for assistant
            // Remove max-width limitation that could be causing truncation
            "max-w-none"
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
            {timeString}
            {message.status === 'streaming' && ' • Streaming'}
            {message.status === 'error' && ' • Error'}
            {message.metadata?.edited && ' • Edited'}
          </span>
          
          {/* User message actions */}
          {isUserMessage && isHovered && onEdit && (
            <div className="ml-2 flex items-center space-x-1 transition-opacity">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 rounded-full"
                      onClick={handleEdit}
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Edit message</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
          
          {/* Assistant message actions */}
          {isAssistant && (
            <div 
              className={cn(
                "ml-2 flex items-center space-x-1 transition-opacity",
                isHovered ? "opacity-100" : "opacity-0"
              )}
            >
              {onReact && (
                <>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "h-6 w-6 rounded-full",
                            reaction === 'up' && "text-green-500"
                          )}
                          onClick={() => handleReaction('up')}
                        >
                          <ThumbsUp className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Helpful</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "h-6 w-6 rounded-full",
                            reaction === 'down' && "text-red-500"
                          )}
                          onClick={() => handleReaction('down')}
                        >
                          <ThumbsDown className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Not helpful</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </>
              )}
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 rounded-full"
                      onClick={handleCopy}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{isCopied ? "Copied!" : "Copy message"}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              {onStar && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "h-6 w-6 rounded-full",
                          isStarred && "text-yellow-400"
                        )}
                        onClick={handleStar}
                      >
                        <Star className="h-3.5 w-3.5" fill={isStarred ? "currentColor" : "none"} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{isStarred ? "Remove star" : "Star message"}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {onRegenerate && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 rounded-full"
                        onClick={handleRegenerate}
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Regenerate response</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 rounded-full"
                  >
                    <MoreVertical className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleCopy}>
                    Copy message
                  </DropdownMenuItem>
                  {onRegenerate && (
                    <DropdownMenuItem onClick={handleRegenerate}>
                      Regenerate
                    </DropdownMenuItem>
                  )}
                  {onStar && (
                    <DropdownMenuItem onClick={handleStar}>
                      {isStarred ? "Remove star" : "Star message"}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 