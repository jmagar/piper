"use client";

import React from 'react';
import { User, Bot } from 'lucide-react';
import { ExtendedChatMessage } from '@/types/chat';
import { MessageRenderer } from './message-renderer';

interface ChatMessageProps {
  /**
   * The message to display
   */
  message: ExtendedChatMessage;
  
  /**
   * Whether this is the last message in the list
   */
  isLastMessage?: boolean | undefined;
  
  /**
   * Whether to show the avatar
   */
  showAvatar?: boolean | undefined;
  
  /**
   * Called when the message is edited
   */
  onEdit?: (() => void) | undefined;
  
  /**
   * Called when a reaction is toggled on the message
   */
  onReact?: ((reaction: 'up' | 'down') => void) | undefined;
  
  /**
   * Called when the message is starred/unstarred
   */
  onStar?: ((starred: boolean) => void) | undefined;
  
  /**
   * Called when the user wants to regenerate this message
   */
  onRegenerate?: (() => void) | undefined;
}

/**
 * Chat Message component
 * Renders a single chat message with proper styling based on role
 */
export function ChatMessage({ 
  message,
  isLastMessage: _isLastMessage = false,
  showAvatar: _showAvatar = true,
  onEdit: _onEdit,
  onReact: _onReact,
  onStar: _onStar,
  onRegenerate: _onRegenerate
}: ChatMessageProps) {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex items-start gap-3 ${isUser ? 'justify-end' : ''}`}>
      {/* Avatar */}
      <div className={`${isUser ? 'order-2' : 'order-1'}`}>
        <div className={`flex items-center justify-center h-8 w-8 rounded-full 
          ${isUser ? 'bg-blue-100' : 'bg-gray-100'}`}>
          {isUser ? (
            <User className="h-5 w-5 text-blue-600" />
          ) : (
            <Bot className="h-5 w-5 text-gray-600" />
          )}
        </div>
      </div>
      
      {/* Message content */}
      <div className={`max-w-[80%] ${isUser ? 'order-1' : 'order-2'}`}>
        <div className={`inline-block p-3 rounded-lg 
          ${isUser ? 'bg-blue-50 text-blue-900 text-left' : 'bg-gray-50 text-gray-900'}`}>
          <MessageRenderer message={message} />
        </div>
        
        {/* Timestamp */}
        <div className={`text-xs text-gray-500 mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
          {message.createdAt ? new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
          {message.status === 'streaming' && (
            <span className="ml-2 inline-flex">
              <span className="animate-pulse">·</span>
              <span className="animate-pulse delay-150">·</span>
              <span className="animate-pulse delay-300">·</span>
            </span>
          )}
          {message.status === 'error' && (
            <span className="ml-2 text-red-500">Error</span>
          )}
        </div>
      </div>
    </div>
  );
} 