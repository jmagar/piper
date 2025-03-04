'use client';

import React from 'react';
import { Settings, AlertCircle, MessageSquare, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ChatToolbarProps {
  conversationId?: string | undefined;
  threadId?: string | undefined;
  showDebug?: boolean;
  onToggleDebug?: (() => void) | undefined;
}

/**
 * Chat Toolbar component
 * Displays the chat header with controls and conversation info
 */
const ChatToolbar = ({ 
  conversationId, 
  threadId, 
  showDebug = false,
  onToggleDebug 
}: ChatToolbarProps) => {
  const handleToggleDebug = () => {
    if (onToggleDebug) {
      onToggleDebug();
    }
  };
  
  const displayConversationId = conversationId 
    ? `Conversation ${conversationId.substring(0, 8)}...` 
    : 'New Chat';
  
  return (
    <div className="border-b p-2 flex items-center justify-between bg-background">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-primary" />
        <div className="flex flex-col">
          <h3 className="text-sm font-medium">
            {displayConversationId}
          </h3>
          {threadId && (
            <p className="text-xs text-muted-foreground">
              Thread: {threadId.substring(0, 8)}...
            </p>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-1">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className={showDebug ? 'text-primary' : 'text-muted-foreground'}
                onClick={handleToggleDebug}
              >
                <AlertCircle className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{showDebug ? 'Hide Debug Panel' : 'Show Debug Panel'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon">
                <Settings className="h-4 w-4 text-muted-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Chat Settings</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Clear Conversation</DropdownMenuItem>
            <DropdownMenuItem>Export Conversation</DropdownMenuItem>
            <DropdownMenuItem className="text-red-500">
              Delete Conversation
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default ChatToolbar; 