"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useChatStore } from "@/components/chat/chat-provider";
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
      try {
        const chatStore = useChatStore.getState();
        chatStore.setMessages([]);
        if (chatStore.setError) {
          chatStore.setError(null);
        }
      } catch (err) {
        console.error("Error resetting chat state:", err);
      }
    };
    
    // Create a new chat session using the API
    const createChat = async () => {
      try {
        resetState();
        setIsLoading(true);
        
        // Use the API to create a new message which will create a conversation
        const api = getChatApi();
        
        // Check if we can just redirect to a default chat ID
        // This is a fallback in case the API isn't ready yet
        const defaultChatId = Math.random().toString(36).substring(2, 15);
        
        try {
          const initialMessage = await api.createMessage("Hello! How can I help you today?");
          
          if (!initialMessage?.conversationId) {
            console.warn("No conversation ID returned, using default");
            router.push(`/chat/${defaultChatId}`);
            return;
          }
          
          console.log("Created new chat with ID:", initialMessage.conversationId);
          router.push(`/chat/${initialMessage.conversationId}`);
        } catch (apiError) {
          console.error("API error, using fallback chat ID:", apiError);
          // If API fails, redirect to a default chat ID anyway
          router.push(`/chat/${defaultChatId}`);
        }
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
    
    // Start chat creation with a slight delay to allow the page to render
    const timer = setTimeout(() => {
      createChat();
    }, 500);
    
    // Cleanup function
    return () => {
      clearTimeout(timer);
    };
  }, [router]);
  
  // Add a timeout to redirect to a default chat if taking too long
  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      if (isLoading) {
        console.log("Creating chat is taking too long, using fallback");
        const fallbackChatId = Math.random().toString(36).substring(2, 15);
        router.push(`/chat/${fallbackChatId}`);
      }
    }, 5000); // 5 second timeout
    
    return () => clearTimeout(fallbackTimer);
  }, [isLoading, router]);
  
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