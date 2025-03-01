# Chat Layout Implementation Guide

## Overview

The Chat Layout component encompasses the core chat UI including the message list, input box, and related features. This implementation guide focuses on refactoring the component to resolve existing issues, optimize for mobile devices, integrate with backend APIs, and leverage React 19 capabilities.

## Component Architecture

```
components-v2/chat/
├── chat-layout.tsx         # Main chat layout component
├── chat-provider.tsx       # Chat state management and API integration 
├── message-list.tsx        # Virtualized message list component
├── message-group.tsx       # Grouped messages by sender
├── message-bubble.tsx      # Individual message bubble component
├── message-input.tsx       # Chat input component with rich features  
├── typing-indicator.tsx    # Typing indicator component
├── file-upload.tsx         # File upload component
├── emoji-picker.tsx        # Emoji picker component
├── command-palette.tsx     # Command palette for quick actions
└── hooks/
    ├── use-chat.ts         # Chat state management hook
    ├── use-messages.ts     # Message list management hook  
    ├── use-websocket.ts    # WebSocket integration hook
    └── use-intersection.ts # Intersection Observer hook for scroll triggers
```

## Key Features

- **Mobile-first layout** with responsive design
- **Virtualized message list** for performance optimization
- **Real-time updates** with WebSocket integration
- **Optimistic updates** for seamless UX
- **Rich message input** with mentions, emojis, and slash commands
- **Infinite scrolling** with smooth loading states
- **Keyboard navigation** for accessibility
- **Drag and drop file uploads** with previews
- **Slash command palette** for quick actions
- **Theming support** for light/dark modes

## Implementation

### 1. Chat Layout Component

```tsx
// components-v2/chat/chat-layout.tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useChatStore } from "@/components-v2/chat/chat-provider";
import { MessageList } from "@/components-v2/chat/message-list";
import { MessageInput } from "@/components-v2/chat/message-input";
import { TypingIndicator } from "@/components-v2/chat/typing-indicator";

interface ChatLayoutProps {
  className?: string;
}

export function ChatLayout({ className }: ChatLayoutProps) {
  const { messages, isLoading, input, setInput, sendMessage } = useChatStore();
  
  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Message List */}
      <MessageList 
        messages={messages}
        isLoading={isLoading}
        className="flex-1 overflow-y-auto"
      />
      
      {/* Typing Indicator */}
      <TypingIndicator className="px-4 py-2" />
      
      {/* Message Input */}
      <MessageInput
        input={input}
        onInputChange={setInput}
        onSend={sendMessage}
        className="px-4 py-2 border-t"
      />
    </div>
  );
}
```

### 2. Chat Provider

```tsx
// components-v2/chat/chat-provider.tsx
"use client";

import * as React from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useWebSocket } from "@/components-v2/chat/hooks/use-websocket";
import { Message } from "@/types/chat";
import { chatApi } from "@/lib/api/chat";

interface ChatStore {
  messages: Message[];
  isLoading: boolean;
  input: string;
  
  setMessages: (messages: Message[]) => void;
  setIsLoading: (isLoading: boolean) => void;
  setInput: (input: string) => void;
  
  sendMessage: (message: string) => Promise<void>;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      messages: [],
      isLoading: true,
      input: "",
      
      setMessages: (messages) => set({ messages }),
      setIsLoading: (isLoading) => set({ isLoading }),
      setInput: (input) => set({ input }),
      
      sendMessage: async (message) => {
        // Optimistic update
        const optimisticMessage: Message = {
          id: crypto.randomUUID(),
          content: message,
          role: "user",
          timestamp: new Date().toISOString(),
        };
        
        set((state) => ({
          messages: [...state.messages, optimisticMessage],
          input: "",
        }));
        
        try {
          // Send to API
          const sentMessage = await chatApi.sendMessage(message);
          
          // Update with API response
          set((state) => ({
            messages: state.messages.map((m) =>
              m.id === optimisticMessage.id ? sentMessage : m
            ),
          }));
        } catch (error) {
          // Remove optimistic message on error
          set((state) => ({
            messages: state.messages.filter(
              (m) => m.id !== optimisticMessage.id
            ),
          }));
          
          console.error("Failed to send message:", error);
        }
      },
    }),
    {
      name: "chat-store",
    }
  )
);

interface ChatProviderProps {
  children: React.ReactNode;
}

export function ChatProvider({ children }: ChatProviderProps) {
  const { messages, setMessages, setIsLoading } = useChatStore();
  
  const { lastMessage } = useWebSocket({
    onMessage(message) {
      setMessages([...messages, message]);
    },
    onConnectionChange(isConnected) {
      setIsLoading(!isConnected);
    },
  });
  
  // Fetch initial messages
  React.useEffect(() => {
    chatApi.getMessages().then((initialMessages) => {
      setMessages(initialMessages);
      setIsLoading(false);
    });
  }, [setMessages, setIsLoading]);
  
  // Scroll to bottom on new messages
  React.useEffect(() => {
    if (lastMessage) {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    }
  }, [lastMessage]);
  
  return <>{children}</>;
}
```

### 3. Message List Component

```tsx
// components-v2/chat/message-list.tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Message } from "@/types/chat";
import { MessageGroup } from "@/components-v2/chat/message-group";
import { useIntersection } from "@/components-v2/chat/hooks/use-intersection";

interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
  onLoadMore?: () => Promise<void>;
  className?: string;
}

export function MessageList({
  messages,
  isLoading = false,
  onLoadMore,
  className,
}: MessageListProps) {
  const listRef = React.useRef<HTMLDivElement>(null);
  
  const { isIntersecting, ref: loadTriggerRef } = useIntersection({
    root: listRef.current,
    rootMargin: "0px 0px 500px 0px",
  });
  
  React.useEffect(() => {
    if (isIntersecting && !isLoading && onLoadMore) {
      onLoadMore();
    }
  }, [isIntersecting, isLoading, onLoadMore]);
  
  return (
    <div ref={listRef} className={cn("flex flex-col space-y-4", className)}>
      {/* Load more trigger */}
      <div ref={loadTriggerRef} />
      
      {/* Message groups */}
      {Object.entries(groupMessagesBySender(messages)).map(([senderId, groupedMessages]) => (
        <MessageGroup 
          key={senderId}
          senderId={senderId}
          messages={groupedMessages}
        />
      ))}
      
      {/* Loading state */}
      {isLoading && (
        <div className="flex justify-center py-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent" />
        </div>
      )}
    </div>
  );
}

/**
 * Group messages by sender for display
 */
function groupMessagesBySender(messages: Message[]) {
  return messages.reduce<Record<string, Message[]>>((acc, message) => {
    const senderId = message.role;
    
    if (!acc[senderId]) {
      acc[senderId] = [];
    }
    
    acc[senderId].push(message);
    
    return acc;
  }, {});
}
```

### 4. Message Input Component

```tsx
// components-v2/chat/message-input.tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useChatStore } from "@/components-v2/chat/chat-provider";
import { Button } from "@/components-v2/ui/button";
import { Input } from "@/components-v2/ui/input";
import { FileUpload } from "@/components-v2/chat/file-upload";
import { EmojiPicker } from "@/components-v2/chat/emoji-picker";
import { CommandPalette } from "@/components-v2/chat/command-palette";

interface MessageInputProps {
  input: string;
  onInputChange: (input: string) => void;
  onSend: (message: string) => Promise<void>;
  className?: string;
}

export function MessageInput({
  input,
  onInputChange,
  onSend,
  className,
}: MessageInputProps) {
  const [isSending, setIsSending] = React.useState(false);
  
  const handleSend = async () => {
    if (!input.trim()) {
      return;
    }
    
    setIsSending(true);
    
    try {
      await onSend(input);
    } catch (error) {
      console.error("Failed to send message:", error);
    }
    
    setIsSending(false);
  };
  
  return (
    <div className={cn("flex items-end space-x-2", className)}>
      {/* Emoji Picker */}
      <EmojiPicker 
        onEmojiSelect={(emoji) => 
          onInputChange(input + emoji)
        }
      />
      
      {/* File Upload */}
      <FileUpload />
      
      {/* Text Input */}
      <Input
        type="text"
        value={input}
        onChange={(e) => onInputChange(e.target.value)}
        placeholder="Type a message..."
        className="flex-1"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }}
      />
      
      {/* Send Button */}
      <Button 
        type="button"
        onClick={handleSend}
        disabled={!input.trim() || isSending}
      >
        {isSending ? "Sending..." : "Send"}
      </Button>
      
      {/* Command Palette */}
      <CommandPalette onCommand={onInputChange} />
    </div>
  );
}
```

## Usage Example

```tsx
// app/chat/[chatId]/page.tsx
import { ChatLayout } from "@/components-v2/chat/chat-layout";
import { ChatProvider } from "@/components-v2/chat/chat-provider";

interface ChatPageProps {
  params: {
    chatId: string;
  };
}

export default function ChatPage({ params }: ChatPageProps) {
  return (
    <ChatProvider>
      <div className="h-full flex flex-col">
        {/* Chat header */}
        <header className="px-4 py-2 border-b">
          <h1 className="text-2xl font-semibold">Chat {params.chatId}</h1>
        </header>
        
        {/* Chat layout */}
        <ChatLayout className="flex-1" />
      </div>
    </ChatProvider>
  );
}
```

## Accessibility Considerations

- Keyboard navigation for all interactive elements
- ARIA attributes for dynamic content (e.g. message list, typing indicator)
- Sufficient color contrast for text and icons
- Proper focus management when opening/closing pickers and palettes
- Semantic HTML for message groups and bubbles
- Alt text for user avatars and media attachments

## Testing Requirements

- Test rendering and functionality of all subcomponents
- Verify optimistic updates and rollbacks
- Ensure proper WebSocket integration and real-time updates
- Test infinite scrolling and loading states
- Validate file upload functionality
- Test emoji picker and command palette behavior
- Verify keyboard navigation and focus management
- Test responsive layout across screen sizes
- Ensure proper theme switching (light/dark)
- Validate integration with backend APIs

## Performance Considerations

- Use virtualized rendering for message list
- Memoize expensive computations and callbacks
- Debounce input events to reduce re-renders
- Lazy load non-critical components (e.g. emoji picker)
- Optimize WebSocket message payloads
- Implement pagination and windowing for large message lists
- Minimize re-renders with React.memo and useMemo
- Code split and lazy load features like file upload and command palette

## Future Enhancements

- Typing indicators for other participants
- Reactions and threaded replies
- Customizable message bubble styles
- Drag and drop file uploads
- Slash command autocomplete
- Linkify URLs in messages
- Syntax highlighting for code blocks
- Pinned messages and bookmarks
- Search and filtering for message list
- Read receipts and message status indicators 