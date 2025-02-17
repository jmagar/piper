import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChatMessage, sendMessage } from '@/lib/api';
import { ThumbsUp, ThumbsDown, Edit2, RotateCcw, Copy, User, Bot } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';

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
    const lastMessageRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (lastMessageRef.current) {
            lastMessageRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent, messageToEdit?: ExtendedChatMessage) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const messageId = uuidv4();
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
            console.log('Sending message:', newMessage.content);
            const response = await sendMessage(newMessage.content);
            console.log('Received response:', response);
            
            const assistantMessage: ExtendedChatMessage = {
                id: uuidv4(),
                role: 'assistant',
                content: response,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            console.error('Error in chat interface:', error);
            const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
            const assistantMessage: ExtendedChatMessage = {
                id: uuidv4(),
                role: 'assistant',
                content: `⚠️ ${errorMessage}\n\nPlease try again or check your connection.`,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, assistantMessage]);
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
                id: uuidv4(),
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

    const formatMessage = (content: string) => {
        // Split content into sections based on markdown-like formatting
        const sections = content.split(/(?=Action:|Result:)/g).map(section => section.trim());
        
        return sections.map((section, index) => {
            if (section.startsWith('Action:')) {
                // Handle tool usage section
                const actionContent = section.replace('Action:', '').trim();
                return (
                    <div key={`action-${index}`} className="flex flex-col gap-2 my-2 bg-blue-500/10 p-3 rounded-lg">
                        <div className="flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400">
                            <span className="bg-blue-100 dark:bg-blue-900/50 p-1 rounded">🛠️ Tool Action</span>
                        </div>
                        <div className="text-sm">{actionContent}</div>
                    </div>
                );
            } else if (section.startsWith('Result:')) {
                // Handle tool result section
                const resultContent = section.replace('Result:', '').trim();
                
                // Process links in the content
                const processedContent = resultContent.split('\n').map((line, lineIndex) => {
                    // Special handling for numbered list items with links
                    const numberedLinkPattern = /^(\d+\.)\s*\[(.*?)\]\((https?:\/\/[^)]+)\)(.*)/;
                    const match = line.match(numberedLinkPattern);
                    
                    if (match) {
                        const [, number, linkText, url, restOfLine] = match;
                        return (
                            <div key={`line-${lineIndex}`} className="flex gap-2 items-baseline py-1">
                                <span className="text-muted-foreground">{number}</span>
                                <div className="flex-1">
                                    <a
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 underline font-medium"
                                    >
                                        {linkText}
                                    </a>
                                    <span className="ml-1">{restOfLine}</span>
                                </div>
                            </div>
                        );
                    }

                    // Handle other types of links
                    const linkPattern = /\[([^\]]+)\]\(([^)]+)\)|\<(https?:\/\/[^\>]+)\>/g;
                    let lastIndex = 0;
                    const elements = [];
                    let linkMatch;

                    while ((linkMatch = linkPattern.exec(line)) !== null) {
                        // Add text before the match
                        if (linkMatch.index > lastIndex) {
                            elements.push(line.slice(lastIndex, linkMatch.index));
                        }

                        // Handle markdown link [text](url) or <url>
                        const linkText = linkMatch[1] || linkMatch[3];
                        const url = linkMatch[2] || linkMatch[3];
                        elements.push(
                            <a
                                key={`link-${linkMatch.index}`}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 underline"
                            >
                                {linkText}
                            </a>
                        );

                        lastIndex = linkMatch.index + linkMatch[0].length;
                    }

                    // Add remaining text
                    if (lastIndex < line.length) {
                        elements.push(line.slice(lastIndex));
                    }

                    return (
                        <div key={`line-${lineIndex}`} className="py-1">
                            {elements.length > 0 ? elements : line}
                        </div>
                    );
                });

                return (
                    <div key={`result-${index}`} className="flex flex-col gap-2 my-2 bg-green-500/10 p-3 rounded-lg">
                        <div className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
                            <span className="bg-green-100 dark:bg-green-900/50 p-1 rounded">✨ Result</span>
                        </div>
                        <div className="text-sm space-y-1">
                            {processedContent}
                        </div>
                    </div>
                );
            } else if (section.includes('```')) {
                // Handle code blocks
                const parts = section.split(/(```[\s\S]*?```)/g);
                return parts.map((part, partIndex) => {
                    if (part.startsWith('```') && part.endsWith('```')) {
                        const code = part.slice(3, -3);
                        const firstLineBreak = code.indexOf('\n');
                        const language = firstLineBreak > -1 ? code.slice(0, firstLineBreak).trim() : '';
                        const actualCode = firstLineBreak > -1 ? code.slice(firstLineBreak + 1) : code;
                        
                        return (
                            <pre key={`code-${index}-${partIndex}`} className="w-full bg-zinc-100 dark:bg-zinc-800 p-4 rounded-md my-2 overflow-x-auto">
                                {language && (
                                    <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">{language}</div>
                                )}
                                <code className="text-sm">{actualCode}</code>
                            </pre>
                        );
                    }

                    // Process regular text with links
                    const elements = [];
                    const linkPattern = /\[([^\]]+)\]\(([^)]+)\)|\<(https?:\/\/[^\>]+)\>/g;
                    let lastIndex = 0;
                    let match;

                    while ((match = linkPattern.exec(part)) !== null) {
                        // Add text before the match
                        if (match.index > lastIndex) {
                            elements.push(part.slice(lastIndex, match.index));
                        }

                        // Handle markdown link [text](url) or <url>
                        const linkText = match[1] || match[3];
                        const url = match[2] || match[3];
                        elements.push(
                            <a
                                key={`link-${match.index}`}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 underline"
                            >
                                {linkText}
                            </a>
                        );

                        lastIndex = match.index + match[0].length;
                    }

                    // Add remaining text
                    if (lastIndex < part.length) {
                        elements.push(part.slice(lastIndex));
                    }

                    return <div key={`text-${index}-${partIndex}`} className="whitespace-pre-wrap">{elements}</div>;
                });
            }

            // Process regular text with links
            const elements = [];
            const linkPattern = /\[([^\]]+)\]\(([^)]+)\)|\<(https?:\/\/[^\>]+)\>/g;
            let lastIndex = 0;
            let match;

            while ((match = linkPattern.exec(section)) !== null) {
                // Add text before the match
                if (match.index > lastIndex) {
                    elements.push(section.slice(lastIndex, match.index));
                }

                // Handle markdown link [text](url) or <url>
                const linkText = match[1] || match[3];
                const url = match[2] || match[3];
                elements.push(
                    <a
                        key={`link-${match.index}`}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 underline"
                    >
                        {linkText}
                    </a>
                );

                lastIndex = match.index + match[0].length;
            }

            // Add remaining text
            if (lastIndex < section.length) {
                elements.push(section.slice(lastIndex));
            }

            return <div key={`text-${index}`} className="whitespace-pre-wrap">{elements}</div>;
        });
    };

    return (
        <div className="flex flex-col h-full w-full font-['Noto_Sans']">
            <div className="flex-1 overflow-y-auto">
                <div className="min-h-full w-full">
                    <div className="space-y-6 px-4 md:px-8 lg:px-12 py-4">
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
                                <div className={cn(
                                    "flex flex-col max-w-[80%] lg:max-w-[70%]",
                                    message.role === 'user' ? 'items-end' : 'items-start'
                                )}>
                                    <div className={cn(
                                        "relative px-4 py-2 rounded-2xl",
                                        message.role === 'user' 
                                            ? 'bg-blue-600 text-white rounded-tr-none before:absolute before:right-0 before:top-0 before:border-8 before:border-t-blue-600 before:border-r-blue-600 before:border-b-transparent before:border-l-transparent' 
                                            : 'bg-secondary text-secondary-foreground rounded-tl-none before:absolute before:left-0 before:top-0 before:border-8 before:border-t-secondary before:border-l-secondary before:border-b-transparent before:border-r-transparent'
                                    )}>
                                        <div className="prose prose-sm dark:prose-invert max-w-none">
                                            {formatMessage(message.content)}
                                        </div>
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