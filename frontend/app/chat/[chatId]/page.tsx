import * as React from 'react';
import { Metadata, Viewport } from 'next';
import { ChatClient } from './client';
import { ExtendedChatMessage } from '@/types/chat';
import { ChatConversation } from '@/types/chat';
import { ReconnectButton } from '../../../components/chat/reconnect-button';

/**
 * Generate metadata for this page
 */
export const metadata: Metadata = {
  title: 'Chat',
  description: 'Chat with your AI assistant',
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

/**
 * Server-side props for the chat page
 * 
 * @param chatId - The ID of the chat to load
 * @returns Chat data including conversation and messages
 */
async function getServerSideProps(chatId: string) {
  try {
    // Get the current user ID (would come from auth)
    const userId = 'user-1';
    
    // Fetch conversation
    const conversation: ChatConversation = { 
      id: chatId, 
      title: 'Chat Session', 
      createdAt: new Date().toISOString(), 
      updatedAt: new Date().toISOString(),
      userId,
      metadata: {
        messageCount: 0,
        userMessageCount: 0,
        botMessageCount: 0,
        toolUsageCount: 0
      }
    };
    
    // Fetch messages
    const messages: ExtendedChatMessage[] = [];
    
    return {
      conversation,
      messages
    };
  } catch (error) {
    console.error('Error loading chat data:', error);
    return {
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
    };
  }
}

/**
 * Chat page component
 * 
 * @param props - Component props
 * @param props.params - Route parameters containing chatId
 * @returns Chat page component with client chat interface
 */
export default async function ChatPage({ 
  params 
}: { 
  params: { chatId: string } 
}) {
  const chatId = params.chatId || 'default-chat-id';
  const initialData = await getServerSideProps(chatId);
  
  return (
    <div className="flex flex-col h-full">
      {/* Debug panel with socket test links */}
      <div className="bg-blue-50 dark:bg-blue-900 text-blue-800 dark:text-blue-100 text-xs sm:text-sm p-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">Socket not connecting?</span>
          <span className="hidden sm:inline">Try our test pages:</span>
          <div className="flex gap-2">
            <a 
              href="/direct-socket-test.html" 
              className="underline font-bold hover:text-blue-600 dark:hover:text-blue-300"
              aria-label="Direct Socket Test"
            >
              Direct Test
            </a>
            <span>|</span>
            <a 
              href="/socket-env-test.html" 
              className="underline font-bold hover:text-blue-600 dark:hover:text-blue-300"
              aria-label="Environment Socket Test"
            >
              Env Test
            </a>
          </div>
        </div>
        <ReconnectButton />
      </div>
      
      <ChatClient chatId={chatId} initialData={initialData} />
    </div>
  );
}