'use client';

import * as React from 'react';
import { Wrench } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { ExtendedChatMessage } from '@/types/chat';
import { useSocket } from '@/lib/socket';
import { MessageHeader } from './message-header';
import { MessageContent } from './message-content';
import { MessageActions } from './message-actions';
import { MessageAvatar } from './message-avatar';
import { MessageThread } from './message-thread';
import { TypingIndicator } from './typing-indicator';
import { Badge } from '@/components/ui/badge';

interface MessageCardProps {
    message: ExtendedChatMessage;
    className?: string;
    onUpdate?: (message: ExtendedChatMessage) => void;
    showHeader?: boolean;
    /**
     * Whether this message is part of a group.
     * Currently not implemented, but kept for future use.
     */
    isPartOfGroup?: boolean;
}

export function MessageCardV2({ 
    message, 
    className, 
    onUpdate,
    showHeader = true,
}: MessageCardProps) {
    const { socket } = useSocket();
    const [isBookmarked, setIsBookmarked] = React.useState(message.metadata?.bookmarked ?? false);
    const [isThreadOpen, setIsThreadOpen] = React.useState(false);
    const [isTyping, setIsTyping] = React.useState(false);
    const messageUserId = React.useMemo(() => message.userId, [message.userId]);

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

    // Validate props
    if (typeof showHeader !== 'boolean') {
        return null;
    }

    const isSystem = message.role === 'system';
    const isUser = message.role === 'user';
    const isAssistant = message.role === 'assistant';
    
    // Determine if a tool is used or being invoked in this message
    const isToolInvocation = message.metadata?.toolInvocation === true;
    const hasToolOutput = !!message.metadata?.toolOutput;
    const isToolUsed = isToolInvocation || hasToolOutput || !!message.metadata?.toolUsed;

    return (
        <div
            className={cn(
                'group relative flex w-full items-start gap-3',
                isUser ? 'justify-end' : 'justify-start',
                message.status === 'streaming' && isAssistant && 'message-streaming border-l-4 border-primary',
                className
            )}
        >
            {!isUser && (
                <MessageAvatar
                    message={message}
                    isSystem={isSystem}
                    isAssistant={isAssistant}
                />
            )}
            <div className={cn(
                "flex flex-col gap-2",
                isUser ? "items-end" : "items-start",
                "max-w-[80%]",
                message.status === 'streaming' && isAssistant && 'bg-primary/5 p-2 rounded-md'
            )}>
                {showHeader && (
                    <div className="flex items-center gap-2 w-full">
                        <MessageHeader
                            message={message}
                            isUser={isUser}
                            isSystem={isSystem}
                            isAssistant={isAssistant}
                        />
                        
                        {/* Tool Indicator Badge */}
                        {isToolUsed && isAssistant && !isUser && (
                            <Badge
                                variant="outline"
                                className={cn(
                                    "ml-auto px-1.5 py-0 h-5 text-xs font-normal gap-1 border-border/40 text-muted-foreground", 
                                    isToolInvocation && message.status === 'streaming' ? "bg-blue-500/10 text-blue-500 border-blue-500/30 animate-pulse" : 
                                    hasToolOutput ? "bg-amber-500/10 text-amber-500 border-amber-500/30" : 
                                    "bg-green-500/10 text-green-500 border-green-500/30"
                                )}
                            >
                                <Wrench className="h-3 w-3" />
                                {isToolInvocation && message.status === 'streaming' 
                                    ? "Using Tool" 
                                    : hasToolOutput 
                                        ? "Tool Output" 
                                        : "Tool Used"}
                            </Badge>
                        )}
                    </div>
                )}
                
                {message.status === 'streaming' && isAssistant && (
                    <div className="text-xs text-primary animate-pulse mb-1 font-bold">
                        Streaming response... {typeof message.content === 'string' && `(${message.content.length} chars)`}
                    </div>
                )}
                
                <MessageContent
                    message={message}
                    isUser={isUser}
                    isSystem={isSystem}
                    isAssistant={isAssistant}
                />
                <MessageActions
                    message={message}
                    isUser={isUser}
                    isBookmarked={isBookmarked}
                    onBookmarkChange={setIsBookmarked}
                    onUpdate={onUpdate ?? (() => {})}
                    onOpenThread={() => setIsThreadOpen(true)}
                />
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
                <MessageAvatar
                    message={message}
                    isSystem={isSystem}
                    isAssistant={isAssistant}
                />
            )}
            <MessageThread
                parentMessage={message}
                isOpen={isThreadOpen}
                onClose={() => setIsThreadOpen(false)}
                onUpdate={onUpdate}
            />
        </div>
    );
}