import * as React from 'react';

import { ChevronDown, ChevronUp, MessageSquare, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useSocket } from '@/lib/socket';
import type { ExtendedChatMessage } from '@/types/chat';

import { MessageCardV2 } from './message-card-v2';
import { MessageInput } from './message-input';

interface MessageThreadProps {
  parentMessage: ExtendedChatMessage;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: (message: ExtendedChatMessage) => void;
}

/**
 * A component that displays and handles threaded message discussions
 * @param parentMessage - The parent message that started the thread
 * @param isOpen - Whether the thread view is open
 * @param onClose - Callback when closing the thread view
 * @param onUpdate - Callback when a message is updated
 */
export function MessageThread({
  parentMessage,
  isOpen,
  onClose,
  onUpdate
}: MessageThreadProps) {
  const { socket, isConnected } = useSocket();
  const [messages, setMessages] = React.useState<ExtendedChatMessage[]>([]);
  const [input, setInput] = React.useState('');
  const [isExpanded, setIsExpanded] = React.useState(true);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadThreadMessages = React.useCallback(async () => {
    try {
      const threadMessages = parentMessage.metadata?.threadMessages ?? [];
      setMessages(threadMessages);
    } catch (error) {
      console.error('Failed to load thread messages:', error);
      toast.error('Failed to load thread messages');
    }
  }, [parentMessage.metadata?.threadMessages]);

  const handleSendMessage = async () => {
    if (!input.trim() || !isConnected || !socket) {
      if (!isConnected) {
        toast.error('Not connected to chat server');
      }
      return;
    }

    const newMessage: ExtendedChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      type: 'text',
      status: 'sending',
      parentId: parentMessage.id,
      metadata: {
        threadId: parentMessage.id
      }
    };

    setMessages(prev => [...prev, newMessage]);
    setInput('');
    scrollToBottom();

    try {
      socket.emit('thread:message', newMessage, (response: { error?: string; message?: ExtendedChatMessage }) => {
        if (response.error) {
          throw new Error(response.error);
        }

        if (response.message) {
          setMessages(prev => 
            prev.map(msg => msg.id === newMessage.id ? response.message! : msg)
          );

          // Update parent message thread count
          const updatedParent = {
            ...parentMessage,
            metadata: {
              ...parentMessage.metadata,
              hasThread: true,
              replyCount: (parentMessage.metadata?.replyCount ?? 0) + 1,
              lastReplyAt: new Date().toISOString()
            }
          };
          onUpdate?.(updatedParent);
        }
      });
    } catch (error) {
      console.error('Failed to send thread message:', error);
      toast.error('Failed to send message');
      setMessages(prev => prev.filter(msg => msg.id !== newMessage.id));
    }
  };

  React.useEffect(() => {
    if (isOpen) {
      void loadThreadMessages();
    }
  }, [isOpen, loadThreadMessages]);

  React.useEffect(() => {
    if (!socket) return;

    const handleNewThreadMessage = (message: ExtendedChatMessage) => {
      if (message.metadata.threadId === parentMessage.id) {
        setMessages(prev => [...prev, message]);
        scrollToBottom();
      }
    };

    socket.on('thread:message:new', handleNewThreadMessage);

    return () => {
      socket.off('thread:message:new', handleNewThreadMessage);
    };
  }, [socket, parentMessage.id]);

  return (
    <Sheet open={isOpen} onOpenChange={open => !open && onClose()}>
      <SheetContent side="right" className="w-[400px] sm:w-[540px] p-0">
        <SheetHeader className="p-4 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-semibold">Thread</SheetTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        <div className="flex flex-col h-[calc(100vh-8rem)]">
          <Card className="rounded-none border-x-0 border-t-0">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Original Message</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-8"
              >
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
            {isExpanded && (
              <MessageCardV2
                message={parentMessage}
                showHeader
                className="border-0 shadow-none"
                onUpdate={onUpdate}
              />
            )}
          </Card>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {messages.map(message => (
                <MessageCardV2
                  key={message.id}
                  message={message}
                  showHeader
                  onUpdate={msg => {
                    setMessages(prev =>
                      prev.map(m => m.id === msg.id ? msg : m)
                    );
                  }}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          <div className="border-t p-4">
            <MessageInput
              value={input}
              onChange={setInput}
              onSend={handleSendMessage}
              isSending={false}
              disabled={!isConnected}
              placeholder="Reply in thread..."
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
} 