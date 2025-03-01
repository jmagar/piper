"use server";

import { revalidatePath } from "next/cache";
import {
  ChatMessage,
  ChatApiError,
  getChatApi,
  ChatConversation
} from "./api-client";
import { v4 as uuidv4 } from 'uuid';
import { redirect } from 'next/navigation';

/**
 * Creates a new chat session
 * @param data - Form data containing optional title and system prompt
 * @returns Result with success status, chat ID, and optional error
 */
export async function createChat(data: FormData): Promise<{ 
  success: boolean; 
  chatId?: string; 
  error?: string 
}> {
  try {
    // Extract data from FormData
    const title = data.get('title') as string | null; // Currently unused but kept for future use
    const systemPrompt = data.get('systemPrompt') as string | null;
    
    // Create initial message with system prompt if provided
    const api = getChatApi();
    const initialContent = systemPrompt || "Hello! How can I help you today?";
    
    // Create a message which will also create a conversation
    const message = await api.createMessage(initialContent);
    
    // Revalidate the chat paths
    revalidatePath("/chat");
    
    // Handle possible undefined conversationId
    if (!message.conversationId) {
      throw new Error("Failed to create conversation: No conversation ID returned");
    }
    
    return {
      success: true,
      chatId: message.conversationId
    };
  } catch (error) {
    console.error("Failed to create chat:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create chat"
    };
  }
}

/**
 * Sends a message in an existing chat
 * @param chatId - ID of the chat to send the message to
 * @param data - Form data containing message content and optional attachments
 * @returns Result with success status, message data, and optional error
 */
export async function sendMessage(chatId: string, data: FormData): Promise<{
  success: boolean;
  message?: ChatMessage;
  error?: string;
}> {
  try {
    // Extract data from FormData
    const content = data.get('content');
    
    // Validate content
    if (!content || typeof content !== 'string') {
      throw new Error("Message content is required");
    }
    
    // Handle attachments if needed (not implemented in current API)
    // const attachments = data.getAll('attachments');
    
    // Send the message
    const api = getChatApi();
    const message = await api.createMessage(content, chatId);
    
    // Revalidate the chat paths
    revalidatePath("/chat");
    revalidatePath(`/chat/${chatId}`);
    
    return {
      success: true,
      message
    };
  } catch (error) {
    console.error(`Failed to send message to chat ${chatId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send message"
    };
  }
}

/**
 * Creates a new message in a conversation
 * @param content - Message content
 * @param conversationId - Optional ID of the conversation
 * @returns Created message
 */
export async function createChatMessage(
  content: string,
  conversationId?: string
): Promise<ChatMessage> {
  try {
    const api = getChatApi();
    const message = await api.createMessage(content, conversationId);
    
    // Revalidate affected paths
    revalidatePath("/chat");
    if (conversationId) {
      revalidatePath(`/chat/${conversationId}`);
    }
    
    return message;
  } catch (error) {
    console.error("Failed to create chat message:", error);
    throw error;
  }
}

/**
 * Gets conversations for the current user
 * @returns List of user conversations
 */
export async function getUserConversations(): Promise<ChatConversation[]> {
  try {
    const api = getChatApi();
    return await api.getUserConversations();
  } catch (error) {
    console.error("Failed to get user conversations:", error);
    throw error;
  }
}

/**
 * Gets messages for a conversation
 * @param conversationId - ID of the conversation
 * @param options - Additional options
 * @returns Messages and pagination data
 */
export async function getChatMessages(
  conversationId: string,
  options?: {
    cursor?: string;
    limit?: number;
    search?: string;
    threadId?: string;
  }
) {
  try {
    const api = getChatApi();
    return await api.getMessages(conversationId, options);
  } catch (error) {
    console.error("Failed to get chat messages:", error);
    throw error;
  }
}

/**
 * Stars a message
 * @param messageId - ID of the message to star
 * @param note - Optional note to add to the starred message
 */
export async function starMessage(messageId: string, note?: string) {
  try {
    const api = getChatApi();
    await api.starMessage(messageId, note);
    revalidatePath("/chat");
  } catch (error) {
    console.error("Failed to star message:", error);
    throw error;
  }
}

/**
 * Unstars a message
 * @param messageId - ID of the message to unstar
 */
export async function unstarMessage(messageId: string) {
  try {
    const api = getChatApi();
    await api.unstarMessage(messageId);
    revalidatePath("/chat");
  } catch (error) {
    console.error("Failed to unstar message:", error);
    throw error;
  }
}

/**
 * This function is intended to delete a conversation, but the API doesn't 
 * provide an endpoint for this operation. You would need to implement
 * a backend endpoint to support this functionality.
 * 
 * @param _conversationId - ID of the conversation to delete (unused)
 */
export async function deleteChat(_conversationId: string): Promise<void> {
  throw new ChatApiError(
    "Delete conversation operation is not supported by the backend API",
    501
  );
}

/**
 * Creates a new chat and redirects to it
 * This is a server action that can be called from client components
 */
export async function createNewChat() {
  try {
    // Generate a new UUID for the chat
    const chatId = uuidv4();
    
    // Redirect to the chat page
    redirect(`/chat/${chatId}`);
  } catch (error) {
    console.error("Error creating new chat:", error);
    throw new Error("Failed to create new chat");
  }
} 