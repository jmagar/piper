"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useChatStore } from "@/components/chat/chat-store";
import { getChatApi } from "../api-client";

/**
 * Client component that handles the creation of a new chat and redirects
 * Creates a new conversation via the API and redirects to it
 */
export default function NewChatClient() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Reset message state first to ensure clean state
    const resetState = () => {
      const chatStore = useChatStore.getState();
      chatStore.setMessages([]);
      if (chatStore.setError) {
        chatStore.setError(null);
      }
    };
    
    // Create a new chat session using the API
    const createChat = async () => {
      try {
        resetState();
        setIsLoading(true);
        
        // Use the API to create a new message which will create a conversation
        const api = getChatApi();
        const initialMessage = await api.createMessage("Hello! How can I help you today?");
        
        if (!initialMessage.conversationId) {
          throw new Error("Failed to create conversation: No conversation ID returned");
        }
        
        console.log("Created new chat with ID:", initialMessage.conversationId);
        
        // Redirect to the new chat page
        router.push(`/chat/${initialMessage.conversationId}`);
      } catch (err) {
        console.error("Error creating new chat:", err);
        setError(err instanceof Error ? err.message : "Failed to create new conversation");
        setIsLoading(false);
      }
    };
    
    createChat();
  }, [router]);
  
  return (
    <div className="flex flex-col items-center justify-center h-full">
      {error ? (
        <div className="text-center p-4 max-w-md">
          <div className="text-red-500 text-xl mb-4">Error</div>
          <p className="text-gray-700 dark:text-gray-300">{error}</p>
          <button 
            onClick={() => router.push('/chat')}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Return to Chat List
          </button>
        </div>
      ) : (
        <>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="ml-4 text-lg mt-4">Creating new chat session...</p>
        </>
      )}
    </div>
  );
} 