'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format, isValid } from 'date-fns';
import { ArrowRight, MessageSquare, User, Calendar, Hash, Wrench } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Conversation } from '@/lib/generated';

interface ConversationCardProps {
    conversation: Conversation;
}

function formatDate(dateStr: string): string {
    try {
        const date = new Date(dateStr);
        if (!isValid(date)) {
            return 'Invalid date';
        }
        return format(date, 'PPp');
    } catch {
        return 'Invalid date';
    }
}

function extractMetadata(conversation: Conversation) {
    const metadata = conversation.metadata || {};
    const summary = typeof metadata.summary === 'string' 
        ? metadata.summary.trim()
        : '';
    const messageCount = typeof metadata.messageCount === 'number'
        ? Math.max(0, Math.floor(metadata.messageCount))
        : 0;
    const userMessageCount = typeof metadata.userMessageCount === 'number'
        ? Math.max(0, Math.floor(metadata.userMessageCount))
        : 0;
    const botMessageCount = typeof metadata.botMessageCount === 'number'
        ? Math.max(0, Math.floor(metadata.botMessageCount))
        : 0;
    const toolUsageCount = typeof metadata.toolUsageCount === 'number'
        ? Math.max(0, Math.floor(metadata.toolUsageCount))
        : 0;
    const formattedDate = formatDate(conversation.updatedAt);
    const title = conversation.title?.trim() || 'Untitled Conversation';

    return {
        summary: summary.slice(0, 500),
        messageCount,
        userMessageCount,
        botMessageCount,
        toolUsageCount,
        formattedDate,
        title: title.slice(0, 100)
    };
}

function ConversationCard({ conversation }: ConversationCardProps) {
    const router = useRouter();

    if (!conversation?.id || typeof conversation.id !== 'string') {
        return null;
    }

    const {
        summary,
        messageCount,
        userMessageCount,
        botMessageCount,
        toolUsageCount,
        formattedDate,
        title
    } = extractMetadata(conversation);

    const handleClick = () => {
        void router.push(`/chat/${encodeURIComponent(conversation.id)}`);
    };

    return (
        <Card 
            className="p-4 hover:shadow-md transition-all cursor-pointer group" 
            onClick={handleClick}
            role="link"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    void handleClick();
                }
            }}
        >
            <div className="flex items-start justify-between gap-4">
                <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h3 className="font-medium truncate">{title}</h3>
                        {toolUsageCount > 0 && (
                            <Badge variant="secondary" className="shrink-0">
                                <Wrench className="w-3 h-3 mr-1" />
                                Tools Used
                            </Badge>
                        )}
                        <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </div>
                    {summary && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                            {summary}
                        </p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>{formattedDate}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            <span>{messageCount} messages</span>
                        </div>
                        {(userMessageCount > 0 || botMessageCount > 0) && (
                            <div className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                <span>{userMessageCount} user / {botMessageCount} bot</span>
                            </div>
                        )}
                        {toolUsageCount > 0 && (
                            <div className="flex items-center gap-1">
                                <Hash className="w-3 h-3" />
                                <span>{toolUsageCount} tools used</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Card>
    );
}

interface ConversationListProps {
    conversations: Conversation[];
    className?: string;
}

export function ConversationList({ conversations, className }: ConversationListProps) {
    if (conversations.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4">
                <MessageSquare className="w-12 h-12 text-muted-foreground" />
                <div className="text-center">
                    <h3 className="text-lg font-semibold">No conversations yet</h3>
                    <p className="text-sm text-muted-foreground">
                        Start a new chat to begin
                    </p>
                </div>
                <Link 
                    href="/chat/new"
                    className={cn(
                        "inline-flex items-center justify-center gap-2",
                        "rounded-md px-4 py-2 text-sm font-medium",
                        "bg-primary text-primary-foreground shadow-sm",
                        "hover:bg-primary/90 transition-colors"
                    )}
                >
                    <MessageSquare className="w-4 h-4" />
                    Start New Chat
                </Link>
            </div>
        );
    }

    return (
        <div className={cn("grid gap-4", className)}>
            {conversations.map((conversation) => (
                <ConversationCard 
                    key={conversation.id} 
                    conversation={conversation} 
                />
            ))}
        </div>
    );
}