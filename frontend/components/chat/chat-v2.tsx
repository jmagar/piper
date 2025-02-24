'use client';

import * as React from 'react';
import { toast } from 'sonner';

import { useSocket } from '@/lib/socket';
import type { ExtendedChatMessage } from '@/types/chat';

import { MessageCardV2 } from './message-card-v2';
import { MessageInput } from './message-input';

export function ChatV2() {
    const messagesEndRef = React.useRef<HTMLDivElement>(null);
    const [conversationId, setConversationId] = React.useState<string | undefined>();
    const [messages, setMessages] = React.useState<ExtendedChatMessage[]>([
        {
            id: 'system-intro',
            role: 'system',
            content: "This is a new chat session. The AI assistant will help you with coding tasks, using various tools and following best practices.",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            type: 'text',
            status: 'delivered',
            metadata: {}
        },
        {
            id: 'welcome',
            role: 'assistant',
            content: `# 👋 Welcome to Your AI Coding Assistant!

I'm here to help you with your development tasks. Here's what I can do:

\`\`\`markdown
Core Capabilities:
├── 🔍 Code Analysis
│   ├── Search and navigate codebases
│   ├── Debug issues and optimize performance
│   └── Review and suggest improvements
│
├── 💻 Code Generation
│   ├── Create new components and features
│   ├── Modify existing code safely
│   └── Follow project standards and best practices
│
├── 🛠️ Development Tools
│   ├── File and directory management
│   ├── Git operations
│   └── Package management
│
└── 📚 Knowledge Support
    ├── Answer programming questions
    ├── Explain concepts and patterns
    └── Provide documentation and examples
\`\`\`

I'm integrated with your development environment and can directly help with:
- Searching and reading files
- Making code changes
- Running commands
- Managing your project

**Ready to get started?** Let me know what you'd like to work on!`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            type: 'text',
            status: 'delivered',
            metadata: {}
        }
    ]);
    const [input, setInput] = React.useState('');
    const [isSending, setIsSending] = React.useState(false);
    const { socket, isConnected } = useSocket();

    const scrollToBottom = React.useCallback((behavior: ScrollBehavior = 'smooth') => {
        messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' });
    }, []);

    // Initial scroll and on new messages
    React.useEffect(() => {
        scrollToBottom('auto');
    }, [messages, scrollToBottom]);

    // Handle new messages
    React.useEffect(() => {
        if (!socket) return;

        const handleNewMessage = (message: ExtendedChatMessage) => {
            setMessages(prev => [...prev, message]);
            // Update conversationId if this is the first response
            if (message.conversationId && !conversationId) {
                setConversationId(message.conversationId);
            }
            scrollToBottom();
        };

        socket.on('message:new', handleNewMessage);
        return () => {
            socket.off('message:new', handleNewMessage);
        };
    }, [socket, scrollToBottom, conversationId]);

    const handleMessageUpdate = React.useCallback((updatedMessage: ExtendedChatMessage) => {
        setMessages(prev => 
            prev.map(msg => msg.id === updatedMessage.id ? updatedMessage : msg)
        );
    }, []);

    const handleSendMessage = React.useCallback(async (message: string, files: File[]) => {
        if (!message.trim() || !isConnected || !socket) {
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
            status: 'sending',
            conversationId,
            metadata: {
                files: files.map(f => ({ name: f.name, size: f.size, type: f.type }))
            }
        };

        setMessages(prev => [...prev, newMessage]);
        setInput('');
        scrollToBottom();
        setIsSending(true);

        try {
            socket.emit('message:sent', newMessage, (response: { error?: string; message?: ExtendedChatMessage }) => {
                if (response.error) {
                    throw new Error(response.error);
                }

                if (response.message) {
                    setMessages(prev => 
                        prev.map(msg => msg.id === newMessage.id ? response.message! : msg)
                    );
                    // Update conversationId if this is the first message
                    if (response.message.conversationId && !conversationId) {
                        setConversationId(response.message.conversationId);
                    }
                }
            });
        } catch (error) {
            console.error('Failed to send message:', error);
            toast.error('Failed to send message');
            setMessages(prev => prev.filter(msg => msg.id !== newMessage.id));
        } finally {
            setIsSending(false);
        }
    }, [input, isConnected, socket, scrollToBottom, conversationId]);

    const handleFilesSelected = React.useCallback((files: File[]) => {
        console.log('Files selected:', files);
        toast.info('File upload coming soon!');
    }, []);

    return (
        <div className="flex h-full flex-col">
            <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-6 pb-4">
                    {messages.map((message) => (
                        <MessageCardV2
                            key={message.id}
                            message={message}
                            onUpdate={handleMessageUpdate}
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