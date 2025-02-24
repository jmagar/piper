"use client"

import { memo, useEffect, useState } from "react"

import Link from "next/link"
import { useRouter } from "next/navigation"

import { format, isValid } from "date-fns"
import { ArrowRight, Loader2, MessageSquare } from "lucide-react"
import { toast } from "sonner"

import { AppSidebar } from "@/components/app-sidebar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { SidebarProvider } from "@/components/ui/sidebar-new"
import { chatService } from "@/lib/api-client"
import type { ApiError, Conversation } from "@/lib/generated"

const DEFAULT_USER_ID = 'test-user-1';

/**
 * Type guard to check if an error is an API error
 */
function isApiError(error: unknown): error is ApiError {
    if (typeof error !== 'object' || error === null) return false;
    
    const maybeApiError = error as { body?: unknown };
    if (typeof maybeApiError.body !== 'object' || maybeApiError.body === null) return false;
    
    const maybeErrorBody = maybeApiError.body as { error?: unknown };
    return typeof maybeErrorBody.error === 'string';
}

/**
 * Format a date string safely
 */
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

/**
 * Safely extract metadata from a conversation
 */
function extractMetadata(conversation: Conversation) {
    const summary = typeof conversation.metadata?.summary === 'string' 
        ? conversation.metadata.summary.trim()
        : '';
    const messageCount = typeof conversation.metadata?.messageCount === 'number'
        ? Math.max(0, Math.floor(conversation.metadata.messageCount))
        : 0;
    const formattedDate = formatDate(conversation.createdAt);
    const title = conversation.title?.trim() || 'Untitled Conversation';

    return {
        summary: summary.slice(0, 500),
        messageCount,
        formattedDate,
        title: title.slice(0, 100)
    };
}

/**
 * Type guard to check if a conversation is valid
 */
function isValidConversation(conv: unknown): conv is Conversation {
    return (
        typeof conv === 'object' &&
        conv !== null &&
        typeof (conv as Conversation).id === 'string' &&
        (conv as Conversation).id.length > 0 &&
        typeof (conv as Conversation).title === 'string' &&
        typeof (conv as Conversation).createdAt === 'string' &&
        typeof (conv as Conversation).updatedAt === 'string'
    );
}

/**
 * Conversation Card Component
 */
const ConversationCard = memo(function ConversationCard({ conversation }: { conversation: Conversation }) {
    const router = useRouter();

    if (!conversation?.id || typeof conversation.id !== 'string') {
        return null;
    }

    const { summary, messageCount, formattedDate, title } = extractMetadata(conversation);
    const safeTitle = title || 'Untitled';
    const safeSummary = summary || '';

    const handleClick = () => {
        void router.push(`/chat/${encodeURIComponent(conversation.id)}`);
    };

    return (
        <Card 
            className="p-4 hover:shadow-md transition-all cursor-pointer" 
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
            <div className="flex items-start justify-between">
                <div className="space-y-1">
                    <h3 className="font-medium">
                        {safeTitle}
                    </h3>
                    {safeSummary.length > 0 ? (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                            {safeSummary}
                        </p>
                    ) : null}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>
                            {formattedDate}
                        </span>
                        <span>•</span>
                        <span>
                            {messageCount} messages
                        </span>
                    </div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
            </div>
        </Card>
    );
});

ConversationCard.displayName = 'ConversationCard';

/**
 * Conversations List Component
 */
function ConversationsList({ conversations }: { conversations: Conversation[] }) {
    return (
        <div className="grid gap-4">
            {conversations.map((conversation) => (
                <ConversationCard 
                    key={conversation.id} 
                    conversation={conversation} 
                />
            ))}
        </div>
    );
}

/**
 * Chat History Page Component
 */
export default function ChatHistoryPage() {
    const router = useRouter();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;

        async function loadConversations() {
            try {
                if (!mounted) return;

                setError(null);
                const data = await chatService.getUserConversations(DEFAULT_USER_ID);
                
                if (!mounted) return;

                if (!Array.isArray(data)) {
                    throw new Error('Invalid response format: expected an array');
                }

                const validConversations = data.filter(isValidConversation);
                setConversations(validConversations);
            } catch (error) {
                if (!mounted) return;
                
                globalThis.console.error('Failed to load conversations:', error);
                const errorMessage = error instanceof Error 
                    ? error.message
                    : isApiError(error)
                        ? error.body.error
                        : 'Failed to load chat history';
                setError(errorMessage);
                toast.error(errorMessage);
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        }

        void loadConversations();

        return () => {
            mounted = false;
        };
    }, []);

    const handleRetry = () => {
        setLoading(true);
        setError(null);
        router.refresh();
    };

    const renderContent = () => {
        if (loading) {
            return (
                <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-6 h-6 animate-spin" />
                </div>
            );
        }

        if (error) {
            return (
                <div className="flex flex-col items-center justify-center h-full gap-4">
                    <div className="text-center">
                        <h3 className="text-lg font-semibold text-destructive">Error</h3>
                        <p className="text-sm text-muted-foreground">
                            {error}
                        </p>
                    </div>
                    <Button onClick={handleRetry}>
                        Try Again
                    </Button>
                </div>
            );
        }

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
                    <Button asChild>
                        <Link href="/chat/new">Start New Chat</Link>
                    </Button>
                </div>
            );
        }

        return <ConversationsList conversations={conversations} />;
    };

    return (
        <SidebarProvider>
            <div className="flex h-screen w-full">
                <AppSidebar />
                <main className="flex-1 w-full overflow-hidden">
                    <div className="h-full flex flex-col">
                        <div className="p-4 border-b flex items-center justify-between bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                            <div>
                                <h1 className="text-2xl font-bold">Chat History</h1>
                                <p className="text-sm text-muted-foreground">
                                    Your previous conversations
                                </p>
                            </div>
                            <Button asChild>
                                <Link href="/chat/new">
                                    <MessageSquare className="w-4 h-4 mr-2" />
                                    New Chat
                                </Link>
                            </Button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4">
                            {renderContent()}
                        </div>
                    </div>
                </main>
            </div>
        </SidebarProvider>
    );
} 