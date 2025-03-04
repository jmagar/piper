"use client";

import React, { useState } from 'react';
import { ChatProvider } from '@/components/chat/providers/chat-provider';
import { ChatLayout } from '@/components/chat/chat-layout';

/**
 * Client component for new chat page
 * This uses our refactored components
 */
export default function NewChatClient() {
  const [showDebug, setShowDebug] = useState(false);
  
  const handleToggleDebug = () => {
    setShowDebug(prev => !prev);
  };
  
  const handleError = (error: Error) => {
    console.error('Chat error:', error);
  };
  
  return (
    <ChatProvider 
      enableTrace={true}
      onError={handleError}
    >
      <ChatLayout 
        showDebug={showDebug}
        onToggleDebug={handleToggleDebug}
      />
    </ChatProvider>
  );
} 