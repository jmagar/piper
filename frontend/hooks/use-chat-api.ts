"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { createChat, sendMessage } from "@/app/chat/actions";
import { useRouter } from "next/navigation";

/**
 * Custom hook for interacting with the Chat API
 * Provides methods for creating chats, sending messages, and managing chat state
 */
export function useChatApi() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  
  // Use a ref to track component mount state
  const isMounted = useRef(true);
  
  // Set isMounted to false when the component unmounts
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  // Safe state setter functions to prevent updates after unmount
  const safeSetIsLoading = useCallback((value: boolean) => {
    if (isMounted.current) {
      setIsLoading(value);
    }
  }, []);
  
  const safeSetError = useCallback((value: string | null) => {
    if (isMounted.current) {
      setError(value);
    }
  }, []);

  /**
   * Create a new chat session
   * @param title - Optional title for the chat
   * @param systemPrompt - Optional system prompt to initialize the chat
   */
  const createNewChat = useCallback(async (title?: string, systemPrompt?: string) => {
    safeSetIsLoading(true);
    safeSetError(null);
    
    try {
      const formData = new FormData();
      if (title) formData.append("title", title);
      if (systemPrompt) formData.append("systemPrompt", systemPrompt);
      
      const result = await createChat(formData);
      
      if (!result.success) {
        throw new Error(result.error || "Failed to create chat");
      }
      
      // Only redirect if component is still mounted
      if (isMounted.current && result.chatId) {
        router.push(`/chat/${result.chatId}`);
        return result.chatId;
      }
      
      return result.chatId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
      safeSetError(errorMessage);
      return null;
    } finally {
      safeSetIsLoading(false);
    }
  }, [router, safeSetIsLoading, safeSetError]);

  /**
   * Send a message in an existing chat
   * @param chatId - ID of the chat to send the message to
   * @param content - Message content
   * @param attachments - Optional file attachments
   */
  const sendChatMessage = useCallback(async (
    chatId: string, 
    content: string, 
    attachments?: string[]
  ) => {
    safeSetIsLoading(true);
    safeSetError(null);
    
    try {
      const formData = new FormData();
      formData.append("content", content);
      
      if (attachments?.length) {
        attachments.forEach(attachment => {
          formData.append("attachments", attachment);
        });
      }
      
      const result = await sendMessage(chatId, formData);
      
      if (!result.success) {
        throw new Error(result.error || "Failed to send message");
      }
      
      return result.message;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
      safeSetError(errorMessage);
      return null;
    } finally {
      safeSetIsLoading(false);
    }
  }, [safeSetIsLoading, safeSetError]);

  /**
   * Create a new chat and send the first message in one operation
   * @param content - First message content
   * @param title - Optional title for the chat
   * @param systemPrompt - Optional system prompt
   */
  const createAndSendMessage = useCallback(async (
    content: string,
    title?: string,
    systemPrompt?: string
  ) => {
    safeSetIsLoading(true);
    safeSetError(null);
    
    try {
      // First create the chat
      const formData = new FormData();
      if (title) formData.append("title", title);
      if (systemPrompt) formData.append("systemPrompt", systemPrompt);
      
      const chatResult = await createChat(formData);
      
      if (!chatResult.success || !chatResult.chatId) {
        throw new Error(chatResult.error || "Failed to create chat");
      }
      
      // Then send the message
      const messageFormData = new FormData();
      messageFormData.append("content", content);
      
      const messageResult = await sendMessage(chatResult.chatId, messageFormData);
      
      if (!messageResult.success) {
        throw new Error(messageResult.error || "Failed to send message");
      }
      
      // Only redirect if component is still mounted
      if (isMounted.current) {
        router.push(`/chat/${chatResult.chatId}`);
      }
      
      return {
        chatId: chatResult.chatId,
        message: messageResult.message
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
      safeSetError(errorMessage);
      return null;
    } finally {
      safeSetIsLoading(false);
    }
  }, [router, safeSetIsLoading, safeSetError]);

  return {
    isLoading,
    error,
    createNewChat,
    sendChatMessage,
    createAndSendMessage
  };
} 