import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatMessage, sendMessage } from '@/lib/api';
import { ThumbsUp, ThumbsDown, Edit2, RotateCcw, Copy, User, Bot } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ExtendedChatMessage extends ChatMessage {
    id: string;
    timestamp: Date;
    liked?: boolean;
    disliked?: boolean;
}

export function ChatInterface() {
    const [messages, setMessages] = useState<ExtendedChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const lastMessageRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (lastMessageRef.current) {
            lastMessageRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent, messageToEdit?: ExtendedChatMessage) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const messageId = crypto.randomUUID();
        const newMessage: ExtendedChatMessage = {
            id: messageId,
            role: 'user',
            content: input.trim(),
            timestamp: new Date()
        };

        if (messageToEdit) {
            setMessages(prev => prev.filter(m => m.id !== messageToEdit.id));
            setEditingMessageId(null);
        }

        setMessages(prev => [...prev, newMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await sendMessage(newMessage.content);
            const assistantMessage: ExtendedChatMessage = {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: response,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            console.error('Error:', error);
            const errorMessage: ExtendedChatMessage = {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: 'Sorry, there was an error processing your message.',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleReaction = (messageId: string, reaction: 'like' | 'dislike') => {
        setMessages(prev => prev.map(message => {
            if (message.id === messageId) {
                if (reaction === 'like') {
                    return { ...message, liked: !message.liked, disliked: false };
                } else {
                    return { ...message, disliked: !message.disliked, liked: false };
                }
            }
            return message;
        }));
    };

    const handleEdit = (message: ExtendedChatMessage) => {
        setEditingMessageId(message.id);
        setInput(message.content);
    };

    const handleRegenerate = async (message: ExtendedChatMessage) => {
        setIsLoading(true);
        try {
            const response = await sendMessage(message.content);
            const newMessage: ExtendedChatMessage = {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: response,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, newMessage]);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = (content: string) => {
        navigator.clipboard.writeText(content);
    };

    return (
        <div className="flex flex-col h-full w-full font-['Noto_Sans']">
            <div className="flex-1 overflow-y-auto">
                <div className="min-h-full w-full">
                    <div className="space-y-6 px-4 md:px-8 lg:px-12">
                        {messages.map((message, index) => (
                            <div
                                key={message.id}
                                ref={index === messages.length - 1 ? lastMessageRef : null}
                                className={cn(
                                    "flex items-start gap-3 group w-full",
                                    message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                                )}
                            >
                                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                    {message.role === 'user' ? <User className="w-6 h-6" /> : <Bot className="w-6 h-6" />}
                                </div>
                                <div className="flex flex-col flex-1">
                                    <div className={cn(
                                        "p-4 rounded-lg w-full",
                                        message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                                    )}>
                                        <pre className="whitespace-pre-wrap font-sans">
                                            {message.content}
                                        </pre>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                                        <span>{format(message.timestamp, 'HH:mm')}</span>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="w-6 h-6"
                                                onClick={() => handleReaction(message.id, 'like')}
                                            >
                                                <ThumbsUp className={cn("w-4 h-4", message.liked && "text-green-500")} />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="w-6 h-6"
                                                onClick={() => handleReaction(message.id, 'dislike')}
                                            >
                                                <ThumbsDown className={cn("w-4 h-4", message.disliked && "text-red-500")} />
                                            </Button>
                                            {message.role === 'user' && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="w-6 h-6"
                                                    onClick={() => handleEdit(message)}
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </Button>
                                            )}
                                            {message.role === 'assistant' && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="w-6 h-6"
                                                    onClick={() => handleRegenerate(message)}
                                                >
                                                    <RotateCcw className="w-4 h-4" />
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="w-6 h-6"
                                                onClick={() => handleCopy(message.content)}
                                            >
                                                <Copy className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <div className="w-2 h-2 rounded-full bg-current animate-bounce" />
                                <div className="w-2 h-2 rounded-full bg-current animate-bounce [animation-delay:0.2s]" />
                                <div className="w-2 h-2 rounded-full bg-current animate-bounce [animation-delay:0.4s]" />
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <form onSubmit={(e) => handleSubmit(e)} className="w-full p-4 border-t md:px-8 lg:px-12">
                <div className="flex gap-2 w-full">
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={editingMessageId ? "Edit your message..." : "Type your message..."}
                        disabled={isLoading}
                        className="flex-1"
                    />
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? 'Sending...' : editingMessageId ? 'Update' : 'Send'}
                    </Button>
                </div>
            </form>
        </div>
    );
} 