"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useChatStore } from "./chat-provider";
import { MessageList } from "./message-list";
import { MessageInput } from "./message-input";
import { TypingIndicator } from "./typing-indicator";

interface ChatLayoutProps {
  className?: string;
  enableFileUpload?: boolean;
  enableEmojiPicker?: boolean;
  enableCommandPalette?: boolean;
}

/**
 * Main chat layout component that combines all chat elements
 * Manages displaying messages, input area, and typing indicators
 */
export function ChatLayout({
  className,
  enableFileUpload = true,
  enableEmojiPicker = true,
  enableCommandPalette = true,
}: ChatLayoutProps) {
  // Get chat state and actions from the store
  const {
    messages,
    isLoading,
    input,
    error,
    setInput,
    sendMessage,
    loadMessages,
  } = useChatStore();
  
  // Ref for container to detect size changes
  const containerRef = React.useRef<HTMLDivElement>(null);
  
  // Mock typing users for demo purposes
  const typingUsers = React.useMemo(() => {
    // Ensure messages is defined and has items
    if (!messages || messages.length === 0) {
      return [];
    }
    
    // Show typing indicator after user messages
    if (messages[messages.length - 1]?.role === 'user') {
      return [{ userId: 'assistant', username: 'Assistant', timestamp: new Date() }];
    }
    return [];
  }, [messages]);
  
  return (
    <div
      ref={containerRef}
      className={cn(
        "flex h-full flex-col overflow-hidden bg-background",
        className
      )}
    >
      {/* Error notification */}
      {error && (
        <div className="bg-destructive/15 border-b border-destructive/30 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      
      {/* Message list */}
      <div className="flex-1 overflow-hidden">
        <MessageList
          messages={messages}
          isLoading={isLoading}
          onLoadMore={loadMessages}
          className="h-full"
        />
      </div>
      
      {/* Typing indicator */}
      <TypingIndicator 
        typingUsers={typingUsers}
        className="border-t border-border/50 px-4 py-1" 
      />
      
      {/* Message input */}
      <div className="border-t border-border p-2 sm:p-4">
        <MessageInput
          value={input}
          onChange={setInput}
          onSend={sendMessage}
          showFileUpload={enableFileUpload}
          showEmojiPicker={enableEmojiPicker}
          showCommandPalette={enableCommandPalette}
          showPromptEnhance={true}
          disabled={isLoading}
          placeholder="Type a message..."
        />
      </div>
    </div>
  );
}

/**
 * Export all chat components for easier imports
 */
export { 
  ChatProvider, 
  useChatStore 
} from "./chat-provider";

export { MessageList } from "./message-list";
export { MessageGroup } from "./message-group";
export { MessageBubble } from "./message-bubble";
export { MessageInput } from "./message-input";
export { TypingIndicator } from "./typing-indicator"; 