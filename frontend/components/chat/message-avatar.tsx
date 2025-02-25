'use client';

import * as React from 'react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { ExtendedChatMessage } from '@/types/chat';

interface MessageAvatarProps {
    message: ExtendedChatMessage;
    isSystem: boolean;
    isAssistant: boolean;
}

export function MessageAvatar({ message, isSystem, isAssistant }: MessageAvatarProps) {
    return (
        <Avatar className="mt-1 h-8 w-8 shrink-0">
            <AvatarFallback>
                {message.username?.[0]?.toUpperCase() ?? (
                    isSystem ? 'S' : isAssistant ? 'A' : 'U'
                )}
            </AvatarFallback>
        </Avatar>
    );
}