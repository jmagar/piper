import * as React from 'react';
import { toast } from 'sonner';

import type { ExtendedChatMessage } from '@/types/chat';
import { chatService } from '@/lib/api-client';
import { useChatSocket } from './use-chat-socket';
import { useChatStreaming } from './use-chat-streaming';
import { WELCOME_MESSAGES } from '@/components/chat/constants';

interface UseMessagesProps {
  initialConversationId?: string;
  scrollToBottom?: () => void;
}

/**
 * Hook for managing chat messages, including loading, sending, and streaming
 */
export function useMessages({ initialConversationId, scrollToBottom }: UseMessagesProps = {}) {
  const [messages, setMessages] = React.useState<ExtendedChatMessage[]>([]);
  const [conversationId, setConversationId] = React.useState<string | undefined>(initialConversationId);
  const [isLoading, setIsLoading] = React.useState(!!initialConversationId);
  const [isSending, setIsSending] = React.useState(false);
  
  const { isConnected, sendMessage } = useChatSocket();
  const {
    updateStreamingContent,
    detectToolInvocation,
    saveCompletedContent,
    cleanupStreamingContent,
    getBestContent
  } = useChatStreaming();

  // Load conversation history
  React.useEffect(() => {
    if (!initialConversationId) {
      // Show welcome messages for new conversations
      setMessages(WELCOME_MESSAGES);
      return;
    }

    async function loadMessages() {
      try {
        setIsLoading(true);
        const response = await chatService.getMessages({
          conversationId: initialConversationId
        });
        if (response.messages) {
          setMessages(response.messages.map(msg => ({
            ...msg,
            status: 'delivered',
            type: msg.type || 'text',
            metadata: {
              ...msg.metadata,
              timestamp: msg.createdAt,
              streamStatus: 'complete'
            }
          })));
        }
      } catch (error) {
        console.error('Failed to load messages:', error);
        toast.error('Failed to load conversation history');
      } finally {
        setIsLoading(false);
      }
    }

    void loadMessages();
  }, [initialConversationId]);

  /**
   * Updates a message in the messages state
   */
  const updateMessage = React.useCallback((updatedMessage: ExtendedChatMessage) => {
    setMessages(prev => 
      prev.map(msg => msg.id === updatedMessage.id ? updatedMessage : msg)
    );
  }, []);

  /**
   * Processes a new message received from the socket
   */
  const handleNewMessage = React.useCallback((message: ExtendedChatMessage) => {
    // Check if this message already exists to prevent duplicates
    setMessages(prev => {
      // Check if we already have this message
      const exists = prev.some(m => m.id === message.id);
      if (exists) {
        console.log(`Message ${message.id} already exists, not adding duplicate`);
        return prev;
      }
      
      console.log(`Adding new message ${message.id} with status ${message.status}`);
      const result = [...prev, message];
      
      // Update conversationId if this is the first response
      if (message.conversationId && !conversationId) {
        setConversationId(message.conversationId);
      }
      
      return result;
    });
  }, [conversationId]);

  /**
   * Processes a message chunk received from the socket
   */
  const handleMessageChunk = React.useCallback(({ 
    messageId, 
    chunk, 
    metadata 
  }: { 
    messageId: string; 
    chunk: string;
    status?: 'streaming';
    metadata?: Record<string, unknown>;
  }) => {
    // Log chunk received with length for debugging
    console.log(`RECEIVED CHUNK for message ${messageId}: length=${chunk.length}`);
    
    // Update the streaming content state
    const updatedContent = updateStreamingContent(messageId, chunk);
    
    // Detect tool invocation patterns in the content
    const isInvokingTool = detectToolInvocation(chunk);
    const wasInvokingTool = metadata?.toolInvocation === true;
    
    // Detect tool invocation from the entire content if not already detected
    const isInvokingToolInFullContent = !isInvokingTool && !wasInvokingTool 
      ? detectToolInvocation(updatedContent)
      : false;
    
    // Log when tool invocation is detected
    if (isInvokingTool || isInvokingToolInFullContent) {
      console.log(`TOOL INVOCATION DETECTED in message ${messageId}`);
    }
    
    // Update message and trigger scroll
    setMessages(prev => {
      const updatedMessages = prev.map(msg => 
        msg.id === messageId 
          ? { 
              ...msg, 
              status: 'streaming' as const,
              content: updatedContent,
              metadata: { 
                ...msg.metadata,
                ...metadata,
                streamStatus: 'streaming' as const,
                contentLength: updatedContent.length,
                // Set tool invocation flag based on detection or existing flag
                toolInvocation: isInvokingTool || isInvokingToolInFullContent || wasInvokingTool
              }
            } 
          : msg
      );
      
      // Throttled scroll during streaming
      if (scrollToBottom) {
        window.setTimeout(scrollToBottom, 10);
      }
      
      return updatedMessages;
    });
  }, [updateStreamingContent, detectToolInvocation, scrollToBottom]);

  /**
   * Processes message completion event from the socket
   */
  const handleMessageComplete = React.useCallback(({ 
    messageId, 
    metadata 
  }: {
    messageId: string;
    metadata?: Record<string, unknown>;
  }) => {
    // CRITICALLY IMPORTANT: Get the backend's full content 
    // This is sent in the metadata as totalContentLength and completeContent
    const backendCompleteContent = metadata?.completeContent as string || '';
    const backendFinalContentPreview = metadata?.finalContent as string || '';
    
    // Get current message
    const currentMsg = messages.find(msg => msg.id === messageId);
    if (!currentMsg) {
      console.error(`Cannot find message ${messageId} to complete!`);
      return;
    }
    
    // CRITICAL: Always use the complete backend content if available
    const useCompleteContent = backendCompleteContent && backendCompleteContent.length > 0;
    
    // Save the final content
    if (useCompleteContent) {
      saveCompletedContent(messageId, backendCompleteContent);
    } else if (currentMsg.content && typeof currentMsg.content === 'string') {
      saveCompletedContent(messageId, currentMsg.content);
    }
    
    // Determine the best content to use
    const bestContent = useCompleteContent
      ? backendCompleteContent
      : currentMsg.content && typeof currentMsg.content === 'string' && currentMsg.content.length > 10
        ? currentMsg.content
        : backendFinalContentPreview || 'Content unavailable';
    
    const contentSource = useCompleteContent 
      ? 'backend-complete' 
      : currentMsg.content && typeof currentMsg.content === 'string' && currentMsg.content.length > 10
          ? 'message-content' 
          : 'fallback';
    
    // Update the message
    setMessages(prev => 
      prev.map(msg => 
        msg.id === messageId 
          ? { 
              ...msg, 
              status: 'sent',
              content: bestContent,
              metadata: { 
                ...msg.metadata,
                ...metadata,
                streamStatus: 'complete',
                streamEndTime: new Date().toISOString(),
                finalContentLength: bestContent.length,
                contentComplete: true,
                contentPreserved: true,
                contentSource,
                // Remove the large content field to avoid bloating message
                completeContent: undefined
              }
            } 
          : msg
      )
    );
    
    // Reset loading state and cleanup streaming state
    setIsSending(false);
    
    // Delay cleanup
    window.setTimeout(() => {
      cleanupStreamingContent(messageId);
    }, 1000);
  }, [messages, saveCompletedContent, cleanupStreamingContent]);

  /**
   * Processes message error event from the socket
   */
  const handleMessageError = React.useCallback(({ 
    messageId, 
    error 
  }: { 
    messageId: string; 
    error: string;
  }) => {
    setMessages(prev => 
      prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, status: 'error', metadata: { ...msg.metadata, error } }
          : msg
      )
    );
    
    cleanupStreamingContent(messageId);
    setIsSending(false);
  }, [cleanupStreamingContent]);

  /**
   * Sends a new user message
   */
  const sendUserMessage = React.useCallback(async (message: string, files: File[] = []) => {
    if (!message.trim() || !isConnected) {
      if (!isConnected) {
        toast.error('Not connected to chat server');
      }
      return;
    }

    const newMessage: ExtendedChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: message.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      type: 'text',
      status: 'sent',
      conversationId,
      metadata: {
        timestamp: new Date().toISOString(),
        streamStatus: 'complete',
        files: files.map(f => ({ name: f.name, size: f.size, type: f.type }))
      }
    };

    setMessages(prev => [...prev, newMessage]);
    if (scrollToBottom) {
      scrollToBottom();
    }
    
    setIsSending(true);

    try {
      const response = await sendMessage(newMessage);
      
      // Ensure user messages are never marked as streaming
      const updatedMessage = {
        ...response,
        ...(response.role === 'user' ? { 
          status: 'sent' as const, 
          metadata: {
            ...response.metadata,
            streamStatus: 'complete' as const
          }
        } : {})
      };
      
      // Update the message with the response from the server
      setMessages(prev => 
        prev.map(msg => msg.id === newMessage.id ? updatedMessage : msg)
      );
      
      // Update conversationId if this is the first message
      if (response.conversationId && !conversationId) {
        setConversationId(response.conversationId);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
      setMessages(prev => prev.filter(msg => msg.id !== newMessage.id));
      setIsSending(false);
    }
  }, [isConnected, conversationId, scrollToBottom, sendMessage]);

  /**
   * Gets the best content for display for each message
   */
  const getProcessedMessages = React.useCallback(() => {
    return messages.map(message => {
      // IMPORTANT: Ensure user messages are never in streaming state
      const isUserMessage = message.role === 'user';
      const messageStatus = isUserMessage ? 'sent' : message.status;
      
      // Determine the best content to display
      const { content: messageContent, source: contentSource } = getBestContent(
        message.id, 
        typeof message.content === 'string' ? message.content : '',
        messageStatus
      );
      
      // Enhanced metadata for debugging and tracking
      const enhancedMetadata = {
        ...message.metadata,
        contentPreserved: true,
        contentLength: messageContent.length,
        // Ensure user messages never have streaming metadata
        streamStatus: isUserMessage ? 'complete' : message.metadata?.streamStatus,
        contentSource
      };
      
      return {
        ...message,
        // Force user messages to 'sent' status
        status: messageStatus,
        content: messageContent,
        metadata: enhancedMetadata
      };
    });
  }, [messages, getBestContent]);

  return {
    messages: getProcessedMessages(),
    isLoading,
    isSending,
    conversationId,
    sendUserMessage,
    updateMessage,
    handleNewMessage,
    handleMessageChunk,
    handleMessageComplete,
    handleMessageError
  };
} 