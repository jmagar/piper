'use client';

import { useEffect, useRef, useState } from 'react';

import { Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useSocket } from '@/lib/socket';
import type { ExtendedChatMessage } from '@/types/chat';

import { MessageListV2 } from './message-list-v2';

const DEFAULT_USER = {
  id: 'test-user-1',
  name: 'Test User',
  email: 'test@example.com'
} as const;

export function ChatV2() {
  const { socket, isConnected, isConnecting } = useSocket();
  const [messages, setMessages] = useState<ExtendedChatMessage[]>([{
    id: 'welcome',
    role: 'system',
    content: 'Welcome to the chat! Type a message to get started.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    type: 'system',
    status: 'sent',
    metadata: {}
  }]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (content: string) => {
    if (content.trim().length === 0 || !isConnected || socket === null) {
      if (!isConnected) {
        toast.error('Not connected to chat server');
      }
      return;
    }

    const tempMessage: ExtendedChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId: DEFAULT_USER.id,
      username: DEFAULT_USER.name,
      type: 'text',
      status: 'sending',
      metadata: {}
    };

    setMessages(prev => [...prev, tempMessage]);
    setInput('');
    setIsSending(true);

    try {
      socket.emit('message:sent', tempMessage, (response: { error?: string; message?: ExtendedChatMessage }) => {
        if (response.error !== undefined) {
          throw new Error(response.error);
        }
        if (response.message !== undefined) {
          setMessages(prev => prev.map(msg => 
            msg.id === tempMessage.id ? { ...response.message, status: 'sent' } : msg
          ));
        }
        scrollToBottom();
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
      setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    if (socket === null) return;

    const handleMessage = (message: ExtendedChatMessage) => {
      setMessages((prev) => [...prev, message]);
      scrollToBottom();
    };

    const handleMessageUpdate = (message: ExtendedChatMessage) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === message.id ? message : m))
      );
    };

    socket.on('message:new', handleMessage);
    socket.on('message:update', handleMessageUpdate);

    return () => {
      socket.off('message:new', handleMessage);
      socket.off('message:update', handleMessageUpdate);
    };
  }, [socket]);

  if (isConnecting) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[hsl(var(--background))]/20">
        <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--muted-foreground))]" />
        <div className="ml-2 text-[hsl(var(--muted-foreground))]">Connecting to chat server...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 w-full bg-[hsl(var(--background))]">
      <div className="flex-1 overflow-y-auto p-4 min-h-0">
        <div className="mx-auto max-w-3xl w-full space-y-4">
          <MessageListV2
            messages={messages}
            isLoading={false}
            hasMore={false}
            onLoadMore={() => {}}
            onMessageUpdate={(message) => {
              setMessages(prev =>
                prev.map(msg => msg.id === message.id ? message : msg)
              );
            }}
          />
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      <div className="border-t border-[hsl(var(--border))] bg-[hsl(var(--background))] p-4">
        <div className="mx-auto max-w-3xl w-full flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void handleSendMessage(input);
              }
            }}
            placeholder={isConnected ? "Type a message..." : "Connecting to chat server..."}
            className="min-h-[60px] w-full resize-none bg-[hsl(var(--background))] focus-visible:ring-1 focus-visible:ring-[hsl(var(--ring))]"
            disabled={isSending || !isConnected}
          />
          <Button
            onClick={() => void handleSendMessage(input)}
            disabled={input.trim().length === 0 || isSending || !isConnected}
            className="h-[60px] w-[60px] shrink-0 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary))]/90"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
} 