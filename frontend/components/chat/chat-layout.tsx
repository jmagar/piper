"use client";

import { useEffect, useRef } from 'react';
import { useChatState } from '@/lib/chat/hooks/use-chat-state';
import { useChatMessages } from '@/lib/chat/hooks/use-chat-messages';
import { ChatMessagesList } from './messages/chat-messages-list';
import { ChatInput } from './input/chat-input';
import { ChatDebug } from './chat-debug';
import ChatToolbar from './chat-toolbar';
import React from "react";

// Update interface to include missing properties
export interface ChatLayoutProps {
  children: React.ReactNode;
  enableFileUpload?: boolean;
  enableEmojiPicker?: boolean;
  enableCommandPalette?: boolean;
  conversationId?: string;
  threadId?: string;
  showDebug?: boolean;
  onToggleDebug?: () => void;
}

/**
 * Chat Layout component
 * 
 * Main layout for the chat interface. Handles:
 * - Message display
 * - Input handling
 * - Debug panel (optional)
 */
export function ChatLayout({
  conversationId,
  threadId,
  showDebug = false,
  onToggleDebug
}: ChatLayoutProps) {
  // Access chat state and functionality
  const {
    messages,
    isLoading,
    error,
    loadMessages,
  } = useChatState();
  
  const { sendMessage } = useChatMessages();
  
  // Container ref for auto-scrolling
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Load messages when conversation ID changes
  useEffect(() => {
    if (conversationId) {
      loadMessages(conversationId);
    }
  }, [conversationId, loadMessages]);
  
  // Handle message submission
  const handleSendMessage = (content: string) => {
    sendMessage(content);
  };
  
  // Handle message regeneration
  const handleRegenerateMessage = () => {
    // Implement regeneration logic
    console.log('Regenerating last message');
  };
  
  return (
    <div className="flex flex-col h-full w-full">
      {/* Chat header */}
      <ChatToolbar
        conversationId={conversationId}
        threadId={threadId}
        showDebug={showDebug}
        onToggleDebug={onToggleDebug}
      />
      
      {/* Messages container */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4 space-y-6"
      >
        {error && (
          <div className="bg-red-50 text-red-500 p-3 rounded mb-4">
            {error}
          </div>
        )}
        
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-pulse text-gray-400">
              Loading messages...
            </div>
          </div>
        ) : (
          <ChatMessagesList 
            messages={messages} 
            isLoading={isLoading}
          />
        )}
      </div>
      
      {/* Chat input */}
      <div className="border-t p-4">
        <ChatInput
          onSendMessage={handleSendMessage}
          onRegenerateMessage={handleRegenerateMessage}
          disabled={isLoading}
        />
      </div>
      
      {/* Debug panel (if enabled) */}
      {showDebug && (
        <div className="border-t border-gray-200 bg-gray-50">
          <ChatDebug />
        </div>
      )}
    </div>
  );
}