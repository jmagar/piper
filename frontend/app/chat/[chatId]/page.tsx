import * as React from 'react';
import { Metadata } from 'next';
import { ChatClient } from './client';
import { getChatApi } from '../api-client';
import { ChatMessage, ChatConversation } from '../api-client';
import { ReconnectButton } from '../../../components/chat/reconnect-button';

/**
 * Generate metadata for this page
 */
export const metadata: Metadata = {
  title: 'Chat',
  description: 'Chat with your AI assistant',
};

/**
 * Server-side props for the chat page
 */
async function getServerSideProps(chatId: string) {
  try {
    const api = getChatApi();
    
    // Fetch conversation
    const conversation: ChatConversation = { 
      id: chatId, 
      title: 'Chat Session', 
      createdAt: new Date().toISOString(), 
      updatedAt: new Date().toISOString(),
      metadata: {
        messageCount: 0,
        userMessageCount: 0,
        botMessageCount: 0,
        toolUsageCount: 0
      }
    };
    
    // Fetch messages
    const messages: ChatMessage[] = [];
    
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
 */
export default async function ChatPage({ params }: { params: { chatId: string } }) {
  // Properly handle params in an async component
  const chatId = String(params?.chatId || 'default-chat-id');
  const initialData = await getServerSideProps(chatId);
  
  return (
    <div className="flex flex-col h-full">
      {/* Add debug links */}
      <div className="bg-blue-50 text-blue-800 text-sm p-2 flex justify-between items-center">
        <div>
          Socket not connecting? Try our test pages:
          <a href="/direct-socket-test.html" className="underline font-bold ml-2 mr-2">Direct Socket Test</a> | 
          <a href="/socket-env-test.html" className="underline font-bold ml-2">Environment Socket Test</a>
        </div>
        <ReconnectButton />
      </div>
      
      <ChatClient chatId={chatId} initialData={initialData} />
    </div>
  );
}