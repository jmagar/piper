"use client";

import * as React from 'react';
import { useState } from 'react';
import { 
  MessageCircle, 
  ThumbsUp, 
  ThumbsDown, 
  MoreVertical, 
  Clipboard, 
  RefreshCw, 
  Star,
  Pencil,
  Check,
  Wrench
} from "lucide-react";
import { format } from 'date-fns';
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ExtendedChatMessage } from "@/types/chat";
import { messageRenderer } from '@/components/chat/messages/message-renderer';

// Define a Tool interface for message tools
export interface MessageTool {
  name: string;
  icon?: string;
  description?: string;
}

export interface ChatMessageProps {
  /**
   * The message to display
   */
  message: ExtendedChatMessage;
  
  /**
   * Whether this message is the last one in the conversation
   */
  isLastMessage?: boolean;
  
  /**
   * Whether to show the avatar for this message
   */
  showAvatar?: boolean;
  
  /**
   * Called when the user wants to edit this message
   * Can be undefined if editing is not allowed
   */
  onEdit?: (() => void) | undefined;
  
  /**
   * Called when the user wants to regenerate the response for this message
   * Can be undefined if regeneration is not allowed
   */
  onRegenerate?: (() => void) | undefined;
  
  /**
   * Called when the user reacts to this message
   * Can be undefined if reactions are not allowed
   */
  onReact?: ((reaction: 'up' | 'down') => void) | undefined;
  
  /**
   * Called when the user stars/unstars this message
   * Can be undefined if starring is not allowed
   */
  onStar?: ((starred: boolean) => void) | undefined;
}

/**
 * Component to display a single chat message
 */
export function ChatMessage({
  message,
  isLastMessage = false,
  showAvatar = true,
  onEdit,
  onRegenerate,
  onReact,
  onStar
}: ChatMessageProps) {
  const { content, role, status, createdAt, metadata = {} } = message;
  const [isCopied, setIsCopied] = useState(false);
  
  const isUser = role === 'user';
  const isAssistant = role === 'assistant';
  const isError = status === 'error';
  const isStreaming = Boolean(status === 'streaming' || metadata?.streaming);
  const isEdited = Boolean(metadata?.edited);
  const isStarred = Boolean(metadata?.starred);
  const reaction = metadata?.reaction as 'up' | 'down' | undefined;
  const timestamp = new Date(createdAt);
  
  // Extract tools from metadata if available
  const tools = (metadata?.tools || []) as MessageTool[];
  
  // Handle copying the message content
  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };
  
  return (
    <div 
      className={cn(
        "group flex items-start gap-3 py-2 px-1",
        isUser ? "justify-end" : "justify-start",
        isStreaming ? "animate-pulse" : ""
      )}
    >
      {!isUser && showAvatar && (
        <div className="flex-shrink-0 mt-0.5">
          <Avatar className="h-8 w-8">
            <MessageCircle className="h-5 w-5" />
          </Avatar>
        </div>
      )}
      
      <div className={cn(
        "max-w-[80%] lg:max-w-[65%]",
        isUser ? "order-first" : "order-last"
      )}>
        <Card 
          className={cn(
            "px-4 py-3 relative overflow-hidden",
            isUser 
              ? "bg-primary text-primary-foreground dark:bg-primary dark:text-primary-foreground" 
              : "bg-background border dark:bg-card dark:border-muted",
            isError ? "border-red-500 dark:border-red-500" : "",
            isStreaming ? "animate-pulse" : ""
          )}
        >
          {/* Message content */}
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {messageRenderer(message)}
          </div>
          
          {/* Tools used */}
          {tools.length > 0 && (
            <div className="mt-2 pt-2 border-t border-border dark:border-muted flex flex-wrap gap-1">
              {tools.map((tool, index) => (
                <span 
                  key={`${message.id}-tool-${index}`}
                  className="inline-flex items-center px-2 py-1 text-xs rounded-full bg-muted font-medium"
                >
                  <Wrench className="h-3 w-3 mr-1" />
                  {tool.name}
                </span>
              ))}
            </div>
          )}
          
          {/* Edited indicator */}
          {isEdited && (
            <div className="text-xs text-muted-foreground mt-1">
              (edited)
            </div>
          )}

          {/* Message actions visible on hover */}
          <div className={cn(
            "opacity-0 group-hover:opacity-100 transition-opacity",
            "absolute top-2 right-2 flex items-center gap-1",
            isUser ? "text-primary-foreground" : "text-foreground"
          )}>
            {isAssistant && onStar && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-6 w-6",
                        isStarred ? "text-yellow-500 dark:text-yellow-400" : ""
                      )}
                      onClick={() => onStar(!isStarred)}
                    >
                      <Star className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isStarred ? "Unstar message" : "Star message"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={handleCopy}
                  >
                    {isCopied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isCopied ? "Copied!" : "Copy message"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            {/* Dropdown for additional actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isUser && onEdit && (
                  <DropdownMenuItem onClick={onEdit}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit message
                  </DropdownMenuItem>
                )}
                
                {isAssistant && onRegenerate && isLastMessage && (
                  <DropdownMenuItem onClick={onRegenerate}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Regenerate response
                  </DropdownMenuItem>
                )}
                
                <DropdownMenuItem onClick={handleCopy}>
                  <Clipboard className="h-4 w-4 mr-2" />
                  Copy message
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </Card>
        
        {/* Message metadata */}
        <div className="flex items-center justify-between mt-1 px-1 text-xs text-muted-foreground">
          <span>
            {format(timestamp, 'h:mm a')}
          </span>
          
          {/* Reactions for assistant messages */}
          {isAssistant && onReact && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-6 w-6",
                  reaction === 'up' ? "text-green-500 dark:text-green-400" : "" 
                )}
                onClick={() => onReact('up')}
              >
                <ThumbsUp className="h-3 w-3" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-6 w-6",
                  reaction === 'down' ? "text-red-500 dark:text-red-400" : ""
                )}
                onClick={() => onReact('down')}
              >
                <ThumbsDown className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {isUser && showAvatar && (
        <div className="flex-shrink-0 mt-0.5">
          <Avatar className="h-8 w-8 bg-primary text-primary-foreground">
            <span className="text-xs font-medium">U</span>
          </Avatar>
        </div>
      )}
    </div>
  );
} 