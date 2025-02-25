'use client';

import * as React from 'react';
import { toast } from 'sonner';

import { useChatSocket } from '@/hooks/use-chat-socket';
import { useMessages } from '@/hooks/use-messages';

import { MessageCardV2 } from './message-card-v2';
import { MessageInput } from './message-input';

interface ChatV2Props {
    conversationId?: string;
}

/**
 * Main chat component that handles message display and input
 */
export function ChatV2({ conversationId: initialConversationId }: ChatV2Props) {
    const messagesEndRef = React.useRef<HTMLDivElement>(null);
    const [input, setInput] = React.useState('');
    
    // Custom hook for scrolling
    const scrollToBottom = React.useCallback(() => {
        const container = messagesEndRef.current?.parentElement;
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }, []);
    
    // Use our custom hooks for chat functionality
    const { isConnected } = useChatSocket();
    const { 
        messages, 
        isLoading, 
        isSending, 
        sendUserMessage,
        updateMessage,
        handleNewMessage,
        handleMessageChunk,
        handleMessageComplete,
        handleMessageError
    } = useMessages({ 
        initialConversationId,
        scrollToBottom
    });
    
    // Set up socket event listeners
    const chatSocket = useChatSocket();

    React.useEffect(() => {
        if (!chatSocket.socket) return;
        
        // Register event handlers
        const cleanupNewMessage = chatSocket.onNewMessage(handleNewMessage);
        const cleanupMessageChunk = chatSocket.onMessageChunk(handleMessageChunk);
        const cleanupMessageComplete = chatSocket.onMessageComplete(handleMessageComplete);
        const cleanupMessageError = chatSocket.onMessageError(handleMessageError);
        
        // Cleanup function
        return () => {
            cleanupNewMessage();
            cleanupMessageChunk();
            cleanupMessageComplete();
            cleanupMessageError();
        };
    }, [chatSocket, handleNewMessage, handleMessageChunk, handleMessageComplete, handleMessageError]);
    
    // Always scroll on any update
    React.useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    /**
     * Handles sending a new message
     */
    const handleSendMessage = React.useCallback(async (message: string, files: File[]) => {
        setInput('');
        await sendUserMessage(message, files);
    }, [sendUserMessage]);

    /**
     * Handles selected files
     */
    const handleFilesSelected = React.useCallback((files: File[]) => {
        console.log('Files selected:', files);
        toast.info('File upload coming soon!');
    }, []);

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col">
            <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-6 pb-4">
                    {messages.map((message) => (
                        <MessageCardV2
                            key={message.id}
                            message={message}
                            onUpdate={updateMessage}
                        />
                    ))}
                    <div ref={messagesEndRef} className="h-px" />
                </div>
            </div>
            <div className="sticky bottom-0 bg-[hsl(var(--background))] border-t">
                <MessageInput
                    value={input}
                    onChange={setInput}
                    onSubmit={handleSendMessage}
                    isSending={isSending}
                    disabled={!isConnected}
                    onAttach={handleFilesSelected}
                    placeholder={isConnected ? "Type a message..." : "Connecting to chat server..."}
                />
            </div>
        </div>
    );
}
