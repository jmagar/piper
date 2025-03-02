"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useChatStore } from "@/components/chat/chat-store";
import { getChatApi } from "../api-client";
import { toast } from "sonner";

/**
 * Client component that handles the creation of a new chat and redirects
 * Creates a new conversation via the API and redirects to it
 * 
 * @returns React component with loading or error state
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
        
        if (!initialMessage?.conversationId) {
          throw new Error("Failed to create conversation: No conversation ID returned");
        }
        
        console.log("Created new chat with ID:", initialMessage.conversationId);
        
        // Redirect to the new chat page
        router.push(`/chat/${initialMessage.conversationId}`);
      } catch (err) {
        console.error("Error creating new chat:", err);
        const errorMessage = err instanceof Error ? err.message : "Failed to create new conversation";
        
        // Show a toast notification
        toast.error("Chat creation failed", {
          description: errorMessage,
          duration: 5000,
        });
        
        setError(errorMessage);
        setIsLoading(false);
      }
    };
    
    // Start chat creation
    createChat();
    
    // Cleanup function
    return () => {
      // Any cleanup if needed
    };
  }, [router]);
  
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] w-full px-4">
      {error ? (
        <div className="text-center p-4 w-full max-w-md bg-background/50 backdrop-blur-sm rounded-lg shadow-sm border border-border">
          <h2 className="text-destructive text-xl font-semibold mb-4" role="alert">Unable to Create Chat</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button 
              onClick={() => {
                setIsLoading(true);
                window.location.reload();
              }}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              aria-label="Try again"
            >
              Try Again
            </button>
            <button 
              onClick={() => router.push('/chat')}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 transition-colors"
              aria-label="Return to chat list"
            >
              Return to Chats
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-center" aria-live="polite" aria-busy="true">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" role="status"></div>
          <p className="mt-4 text-lg font-medium">Creating new chat...</p>
          <p className="text-sm text-muted-foreground mt-2">This will only take a moment</p>
        </div>
      )}
    </div>
  );
} 