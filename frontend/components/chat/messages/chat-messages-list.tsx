"use client";

import * as React from 'react';
import { ExtendedChatMessage } from '@/types/chat';
import { ChatMessage } from '@/components/chat/messages/chat-message';
import { cn } from '@/lib/utils';

/**
 * Props for the ChatMessagesList component
 */
interface ChatMessagesListProps {
  /**
   * The list of messages to display
   */
  messages: ExtendedChatMessage[];
  
  /**
   * Called when a message is edited
   */
  onEditMessage?: (messageId: string) => void;
  
  /**
   * Called when a message reaction is toggled
   */
  onReactToMessage?: (messageId: string, reaction: 'up' | 'down') => void;
  
  /**
   * Called when a message is starred
   */
  onStarMessage?: (messageId: string, starred: boolean) => void;
  
  /**
   * Called when the user wants to regenerate an assistant response
   */
  onRegenerateMessage?: () => void;
  
  /**
   * Additional CSS classes to apply to the component
   */
  className?: string;
}

/**
 * Component that displays a list of chat messages
 */
export function ChatMessagesList({
  messages,
  onEditMessage,
  onReactToMessage,
  onStarMessage,
  onRegenerateMessage,
  className
}: ChatMessagesListProps) {
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  
  // Scroll to the bottom when new messages arrive
  React.useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Group consecutive messages by the same sender
  const groupedMessages = React.useMemo(() => {
    if (!messages.length) return [];
    
    return messages.reduce<ExtendedChatMessage[][]>((groups, message, index) => {
      // Start a new group if this is the first message or if the role changed
      if (index === 0 || message.role !== messages[index - 1]?.role) {
        groups.push([message]);
      } else {
        // Add to the last group if the role is the same
        const currentGroup = groups[groups.length - 1];
        if (currentGroup) {
          currentGroup.push(message);
        }
      }
      return groups;
    }, []);
  }, [messages]);
  
  return (
    <div 
      className={cn(
        "space-y-6 py-4 px-4 md:px-8", 
        className
      )}
    >
      {groupedMessages.map((group, groupIndex) => {
        if (!group.length) return null;
        
        const isLastGroup = groupIndex === groupedMessages.length - 1;
        const role = group[0]?.role;
        
        return (
          <div
            key={`group-${groupIndex}`}
            className={cn(
              "flex flex-col space-y-2",
              role === "assistant" ? "items-start" : "items-end"
            )}
          >
            {group.map((message, messageIndex) => {
              const isLastMessage = isLastGroup && messageIndex === group.length - 1;
              const isFirstInGroup = messageIndex === 0;
              
              return (
                <ChatMessage
                  key={message.id}
                  message={message}
                  isLastMessage={isLastMessage}
                  showAvatar={isFirstInGroup}
                  onEdit={onEditMessage && message.role === 'user' ? 
                    () => onEditMessage(message.id) : undefined}
                  onReact={onReactToMessage && message.role === 'assistant' ? 
                    (reaction) => onReactToMessage(message.id, reaction) : undefined}
                  onStar={onStarMessage ? 
                    (starred) => onStarMessage(message.id, starred) : undefined}
                  onRegenerate={isLastMessage && message.role === 'assistant' && onRegenerateMessage ? 
                    onRegenerateMessage : undefined}
                />
              );
            })}
          </div>
        );
      })}
      
      {/* Element to scroll to at the end of the message list */}
      <div ref={messagesEndRef} />
    </div>
  );
} 