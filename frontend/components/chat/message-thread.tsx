import { useState } from 'react';

import { ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';

import { getMessages } from '@/lib/api';
import type { ExtendedChatMessage } from '@/types/chat';

import { MessageCardV2 as MessageCard } from '../chat/message-card-v2';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';


interface MessageThreadProps {
    message: ExtendedChatMessage;
    onReply: (parentId: string) => void;
}

export function MessageThread({ message, onReply }: MessageThreadProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [replies, setReplies] = useState<ExtendedChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const hasReplies = (message.metadata?.replyCount ?? 0) > 0;
    const replyCount = message.metadata?.replyCount ?? 0;

    async function loadReplies() {
        if (!isExpanded && hasReplies) {
            setIsLoading(true);
            try {
                const result = await getMessages({ threadId: message.id });
                setReplies(result.messages);
            } catch (error) {
                console.error('Failed to load replies:', error);
            } finally {
                setIsLoading(false);
            }
        }
        setIsExpanded(!isExpanded);
    }

    return (
        <div className="space-y-2">
            <MessageCard message={message} />
            
            {hasReplies ? <div className="ml-6 flex items-center gap-2 text-sm text-muted-foreground">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2"
                        onClick={loadReplies}
                    >
                        {isExpanded ? <ChevronUp /> : <ChevronDown />}
                        {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
                    </Button>
                </div> : null}

            {isExpanded ? <div className="ml-6 space-y-2 border-l-2 border-muted pl-4">
                    {isLoading ? (
                        Array.from({ length: replyCount }).map((_, i) => (
                            <Skeleton key={i} className="h-20 w-full" />
                        ))
                    ) : (
                        replies.map(reply => (
                            <MessageCard key={reply.id} message={reply} />
                        ))
                    )}
                </div> : null}

            <Button
                variant="ghost"
                size="sm"
                className="ml-6 gap-2"
                onClick={() => onReply(message.id)}
            >
                <MessageSquare className="h-4 w-4" />
                Reply
            </Button>
        </div>
    );
} 