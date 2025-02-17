import { useEffect, useRef, useState, ChangeEvent, KeyboardEvent, useCallback } from 'react';
import { useInView } from 'react-intersection-observer';
import type { ExtendedChatMessage } from '@/types/chat';
import { getMessages, sendMessage, starMessage, unstarMessage, addReaction, removeReaction } from '@/lib/api';
import { Button } from '../ui/button';
import Textarea from '../ui/textarea';
import { Loader2, Send, ThumbsUp, ThumbsDown, Copy, MessageSquare, Star } from 'lucide-react';
import { toast } from 'sonner';
import { useSocket } from '@/lib/socket';
import { useDebounce } from '@/hooks/use-debounce';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ChatInterfaceProps {
    conversationId?: string;
    initialMessages?: ExtendedChatMessage[];
}

const DEFAULT_USER = {
    id: 'test-user-1',
    name: 'Test User',
    email: 'test@example.com'
};

export function ChatInterface({ conversationId, initialMessages = [] }: ChatInterfaceProps) {
    const [messages, setMessages] = useState<ExtendedChatMessage[]>(initialMessages);
    const [isLoading, setIsLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [input, setInput] = useState('');
    const [cursor, setCursor] = useState<string | undefined>(undefined);
    const [hasMore, setHasMore] = useState(false);
    const { ref: loadMoreRef, inView } = useInView();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const socket = useSocket();
    const debouncedInput = useDebounce(input, 500);

    const loadMessages = useCallback(async () => {
        if (isLoading || !conversationId) return;
        setIsLoading(true);

        try {
            const result = await getMessages({
                conversationId,
                cursor: cursor || undefined,
                limit: 20
            });

            if (result.messages.length > 0) {
                setMessages(prev => {
                    // Filter out any duplicates
                    const newMessages = result.messages.filter(
                        newMsg => !prev.some(existingMsg => existingMsg.id === newMsg.id)
                    );
                    return [...newMessages.reverse(), ...prev];
                });
                
                setCursor(result.nextCursor || undefined);
                setHasMore(!!result.nextCursor);
            } else {
                setHasMore(false);
            }
        } catch (error) {
            console.error('Failed to load messages:', error);
            toast.error('Failed to load messages');
        } finally {
            setIsLoading(false);
        }
    }, [conversationId, cursor, isLoading]);

    // Load initial messages only for existing conversations
    useEffect(() => {
        if (conversationId) {
            setIsLoading(true);
            loadMessages()
                .then(() => {
                    scrollToBottom();
                })
                .catch(error => {
                    console.error('Error loading messages:', error);
                    toast.error('Failed to load message history');
                })
                .finally(() => {
                    setIsLoading(false);
                });
        }
    }, [conversationId, loadMessages]);

    // Load more messages when scrolling up (only for existing conversations)
    useEffect(() => {
        if (conversationId && inView && hasMore && !isLoading) {
            loadMessages();
        }
    }, [inView, conversationId, hasMore, isLoading, loadMessages]);

    // Scroll to bottom on new message
    useEffect(() => {
        if (messages.length > 0 && messages[messages.length - 1].status === 'sending') {
            scrollToBottom();
        }
    }, [messages]);

    // Handle real-time updates
    useEffect(() => {
        if (!socket) return;

        socket.on('message:new', (message: ExtendedChatMessage) => {
            setMessages(prev => [...prev, message]);
        });

        socket.on('message:update', (updatedMessage: ExtendedChatMessage) => {
            setMessages(prev => prev.map(msg => 
                msg.id === updatedMessage.id ? updatedMessage : msg
            ));
        });

        return () => {
            socket.off('message:new');
            socket.off('message:update');
        };
    }, [socket]);

    // Handle typing indicator
    useEffect(() => {
        if (!socket || !debouncedInput) return;

        const timeout = setTimeout(() => {
            // Typing stopped
        }, 2000);

        return () => clearTimeout(timeout);
    }, [debouncedInput, socket]);

    async function handleSendMessage() {
        if (!input.trim()) return;

        const tempMessage: ExtendedChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            timestamp: new Date().toISOString(),
            status: 'sending',
            metadata: {
                username: DEFAULT_USER.name,
                type: 'text',
                conversationId
            }
        };

        // Add the temporary message to the list
        setMessages(prev => [...prev, tempMessage]);
        setInput('');
        setIsSending(true);

        try {
            const { userMessage, assistantMessage } = await sendMessage({
                message: input,
                conversationId,
                userId: DEFAULT_USER.id
            });

            // Replace the temporary message with both the user and assistant messages
            setMessages(prev => {
                const withoutTemp = prev.filter(msg => msg.id !== tempMessage.id);
                return [...withoutTemp, userMessage, assistantMessage];
            });

            scrollToBottom();
        } catch (error) {
            console.error('Failed to send message:', error);
            toast.error('Failed to send message');
            // Remove the temporary message if there was an error
            setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
        } finally {
            setIsSending(false);
        }
    }

    function handleReply(parentId: string) {
        setInput(prev => prev.trim() ? `${prev} ` : '');
        // Store the parent ID in the next message's metadata
        const tempMessage: ExtendedChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: '',
            timestamp: new Date(),
            status: 'sending',
            metadata: {
                username: 'You',
                replyingTo: parentId
            }
        };
        setMessages(prev => [...prev, tempMessage]);
        // Focus input and scroll to bottom
        scrollToBottom();
    }

    function scrollToBottom() {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }

    const handleReactionClick = async (messageId: string, emoji: string) => {
        try {
            const message = messages.find(msg => msg.id === messageId);
            const hasReaction = message?.metadata?.reactions?.[emoji]?.users.some(
                u => u.id === DEFAULT_USER.id
            );

            // Update UI optimistically
            setMessages(prev => prev.map(msg => 
                msg.id === messageId 
                    ? {
                        ...msg,
                        metadata: {
                            ...msg.metadata,
                            reactions: {
                                ...(msg.metadata?.reactions || {}),
                                [emoji]: {
                                    count: ((msg.metadata?.reactions || {})[emoji]?.count || 0) + (hasReaction ? -1 : 1),
                                    users: hasReaction
                                        ? ((msg.metadata?.reactions || {})[emoji]?.users || []).filter(u => u.id !== DEFAULT_USER.id)
                                        : [...((msg.metadata?.reactions || {})[emoji]?.users || []), { id: DEFAULT_USER.id, name: DEFAULT_USER.name }]
                                }
                            }
                        }
                    }
                    : msg
            ));

            // Call API
            const response = hasReaction
                ? await removeReaction(messageId, DEFAULT_USER.id, emoji)
                : await addReaction(messageId, DEFAULT_USER.id, emoji);

            // Update with server response
            setMessages(prev => prev.map(msg => 
                msg.id === messageId 
                    ? {
                        ...msg,
                        metadata: {
                            ...msg.metadata,
                            reactions: response.reactions
                        }
                    }
                    : msg
            ));
        } catch (error) {
            console.error('Error updating reaction:', error);
            toast.error('Failed to update reaction');
            // Revert optimistic update on error
            loadMessages();
        }
    };

    function handleCopy(content: string) {
        navigator.clipboard.writeText(content);
        toast.success('Copied to clipboard');
    }

    async function handleStar(messageId: string) {
        try {
            if (messages.find(msg => msg.id === messageId)?.metadata?.starred) {
                await unstarMessage(messageId, DEFAULT_USER.id);
                // Update UI optimistically
                setMessages(prev => prev.map(msg => 
                    msg.id === messageId 
                        ? {
                            ...msg,
                            metadata: {
                                ...msg.metadata,
                                starred: false
                            }
                        }
                        : msg
                ));
                toast.success('Message unstarred');
            } else {
                await starMessage(messageId, DEFAULT_USER.id);
                // Update UI optimistically
                setMessages(prev => prev.map(msg => 
                    msg.id === messageId 
                        ? {
                            ...msg,
                            metadata: {
                                ...msg.metadata,
                                starred: true
                            }
                        }
                        : msg
                ));
                toast.success('Message starred');
            }
        } catch (error) {
            console.error('Error toggling star:', error);
            toast.error('Failed to toggle star');
        }
    }

    return (
        <div className="flex h-full flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4">
                {/* Load more trigger */}
                {hasMore && (
                    <div ref={loadMoreRef} className="py-2 text-center">
                        {isLoading && (
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        )}
                    </div>
                )}

                {/* Message list */}
                <div className="space-y-4">
                    {messages.map(message => (
                        <div 
                            key={message.id} 
                            className={cn(
                                "flex flex-col",
                                message.role === 'assistant' ? "items-start" : "items-end"
                            )}
                        >
                            <div className={cn(
                                "max-w-[80%] rounded-lg px-4 py-2",
                                message.role === 'assistant' 
                                    ? "bg-muted" 
                                    : "bg-primary text-primary-foreground"
                            )}>
                                <div className="text-sm mb-1 flex items-center gap-2">
                                    <span className="font-medium">
                                        {message.metadata?.username || (message.role === 'assistant' ? 'Assistant' : 'You')}
                                    </span>
                                    <span className="text-xs opacity-70">
                                        {format(new Date(message.timestamp), 'HH:mm')}
                                    </span>
                                </div>
                                <div className="whitespace-pre-wrap">{message.content}</div>
                            </div>
                            
                            {/* Message actions */}
                            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2"
                                    onClick={() => handleReactionClick(message.id, 'like')}
                                >
                                    <ThumbsUp className={cn(
                                        "h-4 w-4 mr-1",
                                        (message.metadata?.reactions?.['like']?.count ?? 0) > 0 && "text-green-500"
                                    )} />
                                    {message.metadata?.reactions?.['like']?.count ?? 0}
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2"
                                    onClick={() => handleReactionClick(message.id, 'dislike')}
                                >
                                    <ThumbsDown className={cn(
                                        "h-4 w-4 mr-1",
                                        (message.metadata?.reactions?.['dislike']?.count ?? 0) > 0 && "text-red-500"
                                    )} />
                                    {message.metadata?.reactions?.['dislike']?.count ?? 0}
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2"
                                    onClick={() => handleCopy(message.content)}
                                >
                                    <Copy className="h-4 w-4 mr-1" />
                                    Copy
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2"
                                    onClick={() => handleReply(message.id)}
                                >
                                    <MessageSquare className="h-4 w-4 mr-1" />
                                    Reply
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2"
                                    onClick={() => handleStar(message.id)}
                                >
                                    <Star className={cn(
                                        "h-4 w-4 mr-1",
                                        message.metadata?.starred ? "fill-yellow-400 text-yellow-400" : ""
                                    )} />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Scroll anchor */}
                <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="border-t p-4">
                <div className="flex gap-2">
                    <Textarea
                        value={input}
                        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
                        onKeyDown={(e: KeyboardEvent<HTMLTextAreaElement>) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                            }
                        }}
                        placeholder="Type a message..."
                        className="min-h-[60px] resize-none"
                    />
                    <Button
                        onClick={handleSendMessage}
                        disabled={!input.trim() || isSending}
                        className="h-[60px] w-[60px]"
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