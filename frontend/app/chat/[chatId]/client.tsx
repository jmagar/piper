'use client';

import * as React from 'react';
import { ChatLayout } from '@/components/chat/chat-layout';
import { useSocket } from '@/lib/socket-setup.js';

import { ChatProvider } from '@/components/chat/chat-provider';
import { ExtendedChatMessage, ChatConversation } from '@/types/chat';

/**
 * Props for the chat client component
 */
interface ChatClientProps {
  chatId: string;
}

/**
 * Client component for the chat page
 * Uses socket connection for real-time chat
 */
export function ChatClient({
  chatId,
}: ChatClientProps) {
  const [isLoading, setIsLoading] = React.useState(true);
  const [initialData, setInitialData] = React.useState<{
    conversation: ChatConversation;
    messages: ExtendedChatMessage[];
  }>({
    conversation: {
      id: chatId,
      title: 'Chat Session',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId: 'user-1',
      metadata: {
        messageCount: 0,
        userMessageCount: 0,
        botMessageCount: 0,
        toolUsageCount: 0
      }
    },
    messages: []
  });
  
  // Get socket state from the context
  const socketContext = useSocket();
  
  // Extract socket connection state
  const connectionState = socketContext.isConnecting ? 'connecting' : socketContext.isConnected ? 'connected' : 'disconnected';
  const isConnected = socketContext.isConnected;
  
  // Fetch conversation data on the client side
  React.useEffect(() => {
    async function fetchData() {
      try {
        // In a real implementation, we'd fetch from an API here
        const response = await fetch(`/api/chat/${chatId}`);
        
        // If the API call succeeds, update with real data
        if (response.ok) {
          const data = await response.json();
          setInitialData(data);
        } else {
          // If API call fails, we'll use the default data that was already set
          console.log('Using default data as API call failed');
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setIsLoading(false);
      }
    }
    
    fetchData();
  }, [chatId]);
  
  return (
    <>
      {isLoading ? (
        <div className="flex h-full items-center justify-center">Loading...</div>
      ) : (
        <ChatProvider
          initialMessages={initialData.messages}
          conversationId={chatId}
        >
          <ChatLayout enableFileUpload={true} enableEmojiPicker={true} enableCommandPalette={false} />
        </ChatProvider>
      )}
      
      {/* Connection status indicator - updated to not be fixed positioned */}
      <div className="absolute bottom-4 right-4 z-10 flex items-center gap-2 rounded-full bg-background p-2 shadow-md">
        <div className={`h-3 w-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="text-xs">{connectionState}</span>
      </div>
    </>
  );
}