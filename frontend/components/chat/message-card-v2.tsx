'use client';

import * as React from 'react';

import { formatDistanceToNow as _formatDistanceToNow } from 'date-fns';
import { MoreHorizontal, Wrench, Reply, Star, Copy, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useMarkdown } from '@/hooks/use-markdown';
import { useSocket } from '@/lib/socket';
import { ChatService } from '@/lib/generated/services/ChatService';
import { cn } from '@/lib/utils';
import type { ExtendedChatMessage, MessageReaction } from '@/types/chat';
import { MessageReactions } from './message-reactions';
import { MessageThread } from './message-thread';
import { MessageStatus } from './message-status';
import { TypingIndicator } from './typing-indicator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const DEFAULT_USER = {
    id: 'test-user-1',
    name: 'Test User',
    email: 'test@example.com'
} as const;

interface MessageCardProps {
    message: ExtendedChatMessage;
    className?: string;
    onUpdate?: (message: ExtendedChatMessage) => void;
    showHeader?: boolean;
    isPartOfGroup?: boolean;
}

function getMessageTimestamp(message: ExtendedChatMessage): Date {
    const timestamp = message.createdAt ?? message.metadata?.timestamp;
    
    if (timestamp === undefined || timestamp === null) {
        globalThis.console.warn('No timestamp found for message:', message);
        return new Date();
    }
    
    try {
        return typeof timestamp === 'number' ? new Date(timestamp) : new Date(timestamp);
    } catch (err) {
        globalThis.console.error('Failed to parse message timestamp:', err);
        return new Date();
    }
}

export function MessageCardV2({ 
    message, 
    className, 
    onUpdate,
    showHeader = true,
    isPartOfGroup = false 
}: MessageCardProps) {
    const { socket } = useSocket();
    const [isBookmarked, setIsBookmarked] = React.useState(message.metadata?.bookmarked ?? false);
    const [isThreadOpen, setIsThreadOpen] = React.useState(false);
    const { renderMarkdown } = useMarkdown({
        allowHtml: false,
        enableSyntaxHighlight: true,
        enableGfm: true,
        showCopyButton: true
    });
    const [isTyping, setIsTyping] = React.useState(false);
    const messageUserId = React.useMemo(() => message.userId, [message.userId]);
    const [isExpanded, setIsExpanded] = React.useState(false);

    const handleBookmark = async () => {
        try {
            if (typeof isBookmarked !== 'boolean') return;
            setIsBookmarked(!isBookmarked);
            
            if (isBookmarked === true) {
                await ChatService.prototype.unstarMessage({
                    messageId: message.id,
                    userId: DEFAULT_USER.id
                });
            } else {
                await ChatService.prototype.starMessage({
                    messageId: message.id,
                    userId: DEFAULT_USER.id
                });
            }
            
            onUpdate?.({
                ...message,
                metadata: {
                    ...message.metadata,
                    bookmarked: !isBookmarked
                }
            });
        } catch (err) {
            globalThis.console.error('Failed to update bookmark:', err);
            toast.error('Failed to update bookmark');
            setIsBookmarked(isBookmarked);
        }
    };

    const handleCopyText = () => {
        if (typeof message.content !== 'string') return;
        
        try {
            void navigator.clipboard.writeText(message.content);
            toast.success('Message copied to clipboard');
        } catch (err) {
            globalThis.console.error('Failed to copy message:', err);
            toast.error('Failed to copy message');
        }
    };

    const handleReaction = async (emoji: string) => {
        try {
            const updatedMessage = { ...message };
            const reactions = updatedMessage.metadata?.reactions || {};
            
            const newReaction: MessageReaction = {
                emoji,
                count: 1,
                users: [{ id: DEFAULT_USER.id, name: DEFAULT_USER.name }]
            };

            if (!reactions[emoji]) {
                reactions[emoji] = newReaction;
            } else {
                reactions[emoji].count += 1;
                reactions[emoji].users.push({ id: DEFAULT_USER.id, name: DEFAULT_USER.name });
            }
            
            updatedMessage.metadata = {
                ...updatedMessage.metadata,
                reactions
            };
            onUpdate?.(updatedMessage);
            
            // Here you would typically make an API call to persist the reaction
            // await ChatService.addReaction(message.id, emoji);
        } catch (error) {
            console.error('Failed to add reaction:', error);
            toast.error('Failed to add reaction');
        }
    };
    
    const handleRemoveReaction = async (emoji: string) => {
        try {
            const updatedMessage = { ...message };
            const reactions = updatedMessage.metadata.reactions || {};
            
            if (reactions[emoji]) {
                reactions[emoji].count -= 1;
                reactions[emoji].users = reactions[emoji].users.filter(
                    user => user.id !== DEFAULT_USER.id
                );
                
                if (reactions[emoji].count === 0) {
                    delete reactions[emoji];
                }
            }
            
            updatedMessage.metadata.reactions = reactions;
            onUpdate?.(updatedMessage);
            
            // Here you would typically make an API call to persist the reaction removal
            // await ChatService.removeReaction(message.id, emoji);
        } catch (error) {
            console.error('Failed to remove reaction:', error);
            toast.error('Failed to remove reaction');
        }
    };

    const handleOpenThread = () => {
        setIsThreadOpen(true);
    };

    const handleCloseThread = () => {
        setIsThreadOpen(false);
    };

    const isSystem = message.role === 'system';
    const isUser = message.role === 'user';
    const isAssistant = message.role === 'assistant';
    const toolUsed = message.metadata?.toolUsed;

    // Validate toolUsed type
    const isValidToolUsed = toolUsed && 
        typeof toolUsed === 'object' && 
        toolUsed !== null &&
        'name' in toolUsed && 
        typeof toolUsed.name === 'string';

    // Setup typing event listeners
    React.useEffect(() => {
        if (!socket) return undefined;

        const handleTypingStart = (user: { userId: string }) => {
            if (messageUserId === user.userId) {
                setIsTyping(true);
            }
        };

        const handleTypingStop = (user: { userId: string }) => {
            if (messageUserId === user.userId) {
                setIsTyping(false);
            }
        };

        socket.on('user:typing', handleTypingStart);
        socket.on('user:stop_typing', handleTypingStop);

        return () => {
            socket.off('user:typing', handleTypingStart);
            socket.off('user:stop_typing', handleTypingStop);
        };
    }, [socket, messageUserId]);

    // Handle expanded state effects
    React.useEffect(() => {
        if (!isExpanded) return undefined;
        // Effect logic here
    }, [isExpanded]);

    // Validate props
    if (typeof showHeader !== 'boolean' || typeof isPartOfGroup !== 'boolean') {
        return null;
    }

    const formatMessageTime = (date: Date) => {
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    return (
        <div
            className={cn(
                'group relative flex w-full items-start gap-3',
                isUser ? 'justify-end' : 'justify-start',
                className
            )}
        >
            {!isUser && (
                <Avatar className="mt-1 h-8 w-8 shrink-0">
                    <AvatarFallback>
                        {message.username?.[0]?.toUpperCase() ?? (
                            isSystem ? 'S' : isAssistant ? 'A' : 'U'
                        )}
                    </AvatarFallback>
                </Avatar>
            )}
            <div className={cn(
                "flex flex-col gap-2",
                isUser ? "items-end" : "items-start",
                "max-w-[80%]"
            )}>
                {showHeader && (
                    <div className={cn(
                        "flex items-center gap-2 px-0.5 text-sm",
                        isUser && "flex-row-reverse"
                    )}>
                        <span className="font-medium text-foreground/80">
                            {message.username ?? (isSystem ? 'System' : isAssistant ? 'Assistant' : 'You')}
                        </span>
                        <time className="text-muted-foreground/60 text-xs">
                            {formatMessageTime(getMessageTimestamp(message))}
                        </time>
                        {message.metadata?.edited && (
                            <span className="text-muted-foreground/60 text-xs italic">
                                (edited)
                            </span>
                        )}
                        {isValidToolUsed && (
                            <span className="flex items-center gap-1 text-muted-foreground/60 text-xs bg-muted/40 px-1.5 py-0.5 rounded-md">
                                <Wrench className="h-3 w-3" />
                                {toolUsed.name}
                            </span>
                        )}
                        <MessageStatus message={message} />
                    </div>
                )}
                <div className={cn(
                    'rounded-2xl px-4 py-3 text-sm shadow-sm transition-colors',
                    isSystem && 'bg-muted/30 mx-auto max-w-2xl border border-border/50 dark:bg-muted/10',
                    isUser && 'bg-gradient-to-br from-blue-600 to-blue-700 text-white ml-auto shadow-lg hover:shadow-xl',
                    isAssistant && 'bg-gray-100 dark:bg-gray-800 border border-border/50 dark:border-border/20',
                    message.metadata?.toolOutput && 'bg-muted/10 border border-border/50 dark:border-border/20',
                    'relative'
                )}>
                    {message.metadata?.toolOutput ? (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground border-b border-border/50 pb-2 mb-2">
                                <Wrench className="h-3 w-3" />
                                <span>Tool Output: {message.metadata.toolUsed?.name}</span>
                            </div>
                            <div className="prose prose-sm dark:prose-invert max-w-none prose-pre:my-0 prose-p:leading-normal prose-p:my-1 prose-headings:mb-2 prose-headings:mt-4 first:prose-headings:mt-0 prose-pre:bg-muted/50 prose-pre:border prose-pre:border-border/50 prose-code:text-foreground/90 prose-code:bg-muted/50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none">
                                {typeof message.content === 'string' ? renderMarkdown(message.content) : null}
                            </div>
                        </div>
                    ) : (
                        <div className={cn(
                            "prose prose-sm dark:prose-invert max-w-none",
                            "prose-pre:my-0 prose-p:leading-normal prose-p:my-1",
                            "prose-headings:mb-2 prose-headings:mt-4 first:prose-headings:mt-0",
                            "prose-pre:bg-muted/50 prose-pre:border prose-pre:border-border/50",
                            "prose-code:text-foreground/90 prose-code:bg-muted/50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded-md",
                            "prose-code:before:content-none prose-code:after:content-none",
                            "prose-ul:my-1 prose-ul:list-none",
                            "prose-li:my-1",
                            "[&_ul]:space-y-1 [&_ul]:pl-6",
                            "[&_ul>li]:relative [&_ul>li]:pl-6",
                            "[&_ul>li]:before:absolute [&_ul>li]:before:left-0 [&_ul>li]:before:top-[0.6875em] [&_ul>li]:before:h-px [&_ul>li]:before:w-4 [&_ul>li]:before:bg-border/40",
                            "[&_ul>li]:after:absolute [&_ul>li]:after:left-0 [&_ul>li]:after:top-0 [&_ul>li]:after:h-full [&_ul>li]:after:w-px [&_ul>li]:after:bg-border/40",
                            "[&_ul>li:last-child]:after:h-[0.875em]",
                            isUser && "prose-headings:text-white prose-p:text-white/90 prose-code:text-white prose-code:bg-white/10 [&_ul>li]:before:bg-white/40 [&_ul>li]:after:bg-white/40"
                        )}>
                            {typeof message.content === 'string' ? renderMarkdown(message.content) : null}
                        </div>
                    )}
                </div>
                <div className={cn(
                    "flex items-center gap-1 px-0.5 opacity-0 transition-all group-hover:opacity-100",
                    isUser ? "flex-row" : "flex-row-reverse"
                )}>
                    <MessageReactions
                        reactions={message.metadata?.reactions || {}}
                        onReact={handleReaction}
                        onRemoveReaction={handleRemoveReaction}
                        currentUserId={DEFAULT_USER.id}
                    />

                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-full hover:bg-muted/50"
                        onClick={() => void handleOpenThread()}
                    >
                        <Reply className="h-3.5 w-3.5" />
                        <span className="sr-only">Reply</span>
                    </Button>

                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-full hover:bg-muted/50"
                        onClick={() => void handleBookmark()}
                    >
                        <Star className={cn(
                            'h-3.5 w-3.5',
                            isBookmarked && 'fill-yellow-400 text-yellow-400'
                        )} />
                        <span className="sr-only">Star message</span>
                    </Button>

                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-full hover:bg-muted/50"
                        onClick={() => void handleCopyText()}
                    >
                        <Copy className="h-3.5 w-3.5" />
                        <span className="sr-only">Copy message</span>
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-full hover:bg-muted/50"
                            >
                                <MoreHorizontal className="h-3.5 w-3.5" />
                                <span className="sr-only">More options</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align={isUser ? "end" : "start"} className="w-48">
                            <DropdownMenuItem onClick={() => void handleBookmark()}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit message
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => void handleCopyText()}>
                                <Copy className="mr-2 h-4 w-4" />
                                Copy message
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => void handleBookmark()} className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete message
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                {isTyping && (
                    <TypingIndicator 
                        className={cn(
                            "mt-0.5 px-0.5",
                            isUser && "text-right"
                        )}
                        username={message.username}
                    />
                )}
            </div>
            {isUser && (
                <Avatar className="mt-1 h-8 w-8 shrink-0">
                    <AvatarFallback>
                        {message.username?.[0]?.toUpperCase() ?? 'U'}
                    </AvatarFallback>
                </Avatar>
            )}
            <MessageThread
                parentMessage={message}
                isOpen={isThreadOpen}
                onClose={handleCloseThread}
                onUpdate={onUpdate}
            />
        </div>
    );
} 