'use client';

import * as React from 'react';
import { Wrench } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { ExtendedChatMessage } from '@/types/chat';
import { MessageStatus } from './message-status';

interface MessageHeaderProps {
    message: ExtendedChatMessage;
    isUser: boolean;
    isSystem: boolean;
    isAssistant: boolean;
}

function formatMessageTime(date: Date) {
    return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
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

export function MessageHeader({ message, isUser, isSystem, isAssistant }: MessageHeaderProps) {
    const toolUsed = message.metadata?.toolUsed;
    const isValidToolUsed = toolUsed && 
        typeof toolUsed === 'object' && 
        toolUsed !== null &&
        'name' in toolUsed && 
        typeof toolUsed.name === 'string';

    return (
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
    );
}