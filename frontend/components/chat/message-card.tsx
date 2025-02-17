import { useState } from 'react';
import { ExtendedChatMessage } from '@/types/chat';
import { updateReactionsBatch, bookmarkMessage } from '@/lib/api';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { EmojiPicker } from '../ui/emoji-picker';
import { Bookmark, BookmarkCheck, MoreHorizontal } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface MessageCardProps {
    message: ExtendedChatMessage;
    className?: string;
}

export function MessageCard({ message, className }: MessageCardProps) {
    const [isBookmarked, setIsBookmarked] = useState(message.metadata?.bookmarked || false);
    const [reactions, setReactions] = useState(message.metadata?.reactions || {});

    async function handleReaction(emoji: string) {
        try {
            // In a real app, get the userId from auth context
            const userId = 'test-user';
            const currentReactions = Object.entries(reactions)
                .filter(([, data]) => data.users.some(u => u.id === userId))
                .map(([emoji]) => emoji);

            // Toggle the emoji
            const newReactions = currentReactions.includes(emoji)
                ? currentReactions.filter(e => e !== emoji)
                : [...currentReactions, emoji];

            const result = await updateReactionsBatch(message.id, userId, newReactions);
            setReactions(result.reactions);
        } catch (error) {
            console.error('Failed to update reaction:', error);
        }
    }

    async function handleBookmark() {
        try {
            await bookmarkMessage(message.id);
            setIsBookmarked(!isBookmarked);
        } catch (error) {
            console.error('Failed to toggle bookmark:', error);
        }
    }

    return (
        <Card className={cn('p-4', className)}>
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="font-medium">
                            {message.metadata?.username || 'Unknown'}
                        </span>
                        <span>•</span>
                        <span>
                            {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
                        </span>
                        {message.metadata?.edited && (
                            <>
                                <span>•</span>
                                <span className="italic">edited</span>
                            </>
                        )}
                    </div>
                    <div className="mt-1 whitespace-pre-wrap">{message.content}</div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleBookmark}
                        className={cn(
                            'text-muted-foreground hover:text-foreground',
                            isBookmarked && 'text-foreground'
                        )}
                    >
                        {isBookmarked ? <BookmarkCheck /> : <Bookmark />}
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <MoreHorizontal />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem>Copy Text</DropdownMenuItem>
                            <DropdownMenuItem>Edit Message</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
                                Delete Message
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {Object.keys(reactions).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                    {Object.entries(reactions).map(([emoji, data]) => (
                        <Button
                            key={emoji}
                            variant="secondary"
                            size="sm"
                            className="gap-1 text-sm"
                            onClick={() => handleReaction(emoji)}
                        >
                            {emoji}
                            <span className="text-muted-foreground">{data.count}</span>
                        </Button>
                    ))}
                </div>
            )}

            <div className="mt-2">
                <EmojiPicker onEmojiSelect={handleReaction} />
            </div>
        </Card>
    );
} 