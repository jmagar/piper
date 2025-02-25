'use client';

import * as React from 'react';
import { MoreHorizontal, Reply, Star, Copy, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { ChatService } from '@/lib/generated/services/ChatService';
import type { ExtendedChatMessage, MessageReaction } from '@/types/chat';
import { MessageReactions } from './message-reactions';
import { DEFAULT_USER } from './message-utils';

interface MessageActionsProps {
    message: ExtendedChatMessage;
    isUser: boolean;
    isBookmarked: boolean;
    onBookmarkChange: (isBookmarked: boolean) => void;
    onUpdate: (message: ExtendedChatMessage) => void;
    onOpenThread: () => void;
}

function convertToMessageReactions(reactions: ExtendedChatMessage['metadata']['reactions']): Record<string, MessageReaction> {
    if (!reactions) return {};
    
    const result: Record<string, MessageReaction> = {};
    for (const [emoji, reaction] of Object.entries(reactions)) {
        result[emoji] = {
            emoji,
            count: reaction.count,
            users: reaction.users
        };
    }
    return result;
}

export function MessageActions({
    message,
    isUser,
    isBookmarked,
    onBookmarkChange,
    onUpdate,
    onOpenThread
}: MessageActionsProps) {
    const handleBookmark = async () => {
        try {
            onBookmarkChange(!isBookmarked);
            
            if (isBookmarked) {
                await ChatService.unstarMessage({
                    requestBody: {
                        messageId: message.id,
                        userId: DEFAULT_USER.id
                    }
                });
            } else {
                await ChatService.starMessage({
                    requestBody: {
                        messageId: message.id,
                        userId: DEFAULT_USER.id
                    }
                });
            }
        } catch (error) {
            console.error('Failed to update bookmark:', error);
            toast.error('Failed to update bookmark');
            onBookmarkChange(isBookmarked); // Revert on error
        }
    };

    const handleCopyText = () => {
        if (typeof message.content !== 'string') return;
        
        if (typeof navigator === 'undefined' || !navigator.clipboard) {
            // Fallback for environments without clipboard API
            const textArea = document.createElement('textarea');
            textArea.value = message.content;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                toast.success('Message copied to clipboard');
            } catch (error) {
                console.error('Failed to copy text:', error);
                toast.error('Failed to copy message');
            }
            document.body.removeChild(textArea);
            return;
        }

        navigator.clipboard.writeText(message.content).then(() => {
            toast.success('Message copied to clipboard');
        }).catch((error) => {
            console.error('Failed to copy text:', error);
            toast.error('Failed to copy message');
        });
    };

    const handleReaction = async (emoji: '👍' | '👎') => {
        try {
            const updatedMessage = { ...message };
            const reactions = updatedMessage.metadata?.reactions || {};
            
            if (!reactions[emoji]) {
                reactions[emoji] = {
                    count: 1,
                    users: [{ id: DEFAULT_USER.id, name: DEFAULT_USER.name }]
                };
            } else {
                reactions[emoji] = {
                    ...reactions[emoji],
                    count: reactions[emoji].count + 1,
                    users: [...reactions[emoji].users, { id: DEFAULT_USER.id, name: DEFAULT_USER.name }]
                };
            }
            
            updatedMessage.metadata = {
                ...updatedMessage.metadata,
                reactions
            };
            onUpdate(updatedMessage);
        } catch (error) {
            console.error('Failed to add reaction:', error);
            toast.error('Failed to add reaction');
        }
    };
    
    const handleRemoveReaction = async (emoji: '👍' | '👎') => {
        try {
            const updatedMessage = { ...message };
            const reactions = updatedMessage.metadata?.reactions || {};
            
            if (reactions[emoji]) {
                reactions[emoji] = {
                    ...reactions[emoji],
                    count: reactions[emoji].count - 1,
                    users: reactions[emoji].users.filter(user => user.id !== DEFAULT_USER.id)
                };
                
                if (reactions[emoji].count === 0) {
                    delete reactions[emoji];
                }
            }
            
            updatedMessage.metadata = {
                ...updatedMessage.metadata,
                reactions
            };
            onUpdate(updatedMessage);
        } catch (error) {
            console.error('Failed to remove reaction:', error);
            toast.error('Failed to remove reaction');
        }
    };

    return (
        <div className={cn(
            "flex items-center gap-1 px-0.5 opacity-0 transition-all group-hover:opacity-100",
            isUser ? "flex-row" : "flex-row-reverse"
        )}>
            <MessageReactions
                reactions={convertToMessageReactions(message.metadata?.reactions)}
                onReact={handleReaction}
                onRemoveReaction={handleRemoveReaction}
                currentUserId={DEFAULT_USER.id}
            />

            <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-full hover:bg-muted/50"
                onClick={onOpenThread}
            >
                <Reply className="h-3.5 w-3.5" />
                <span className="sr-only">Reply</span>
            </Button>

            <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-full hover:bg-muted/50"
                onClick={handleBookmark}
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
                onClick={handleCopyText}
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
                    <DropdownMenuItem onClick={handleBookmark}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit message
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleCopyText}>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy message
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleBookmark} className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete message
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}