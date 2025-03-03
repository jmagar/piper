'use client';

import * as React from 'react';
import { ChatLayout } from '@/components/chat/chat-layout';
import { useSocket } from '@/lib/socket-provider';

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
  const { isConnected } = useSocket();
  
  // Log socket connection status
  React.useEffect(() => {
    console.log('Socket connection status:', isConnected ? 'Connected' : 'Disconnected');
  }, [isConnected]);
  
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
      
      {/* Connection status indicator has been moved to the header */}
    </>
  );
}