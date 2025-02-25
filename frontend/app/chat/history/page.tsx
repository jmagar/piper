'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

import { AppSidebar } from '@/components/app-sidebar';
import { Button } from '@/components/ui/button';
import { SidebarProvider } from '@/components/ui/sidebar-new';
import { ConversationList } from '@/components/chat/conversation-list';
import { chatService } from '@/lib/api-client';
import type { ApiError, Conversation } from '@/lib/generated';

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
 * Type guard to check if a conversation is valid
 */
function isValidConversation(conv: unknown): conv is Conversation {
    return (
        typeof conv === 'object' &&
        conv !== null &&
        typeof (conv as Conversation).id === 'string' &&
        typeof (conv as Conversation).title === 'string' &&
        typeof (conv as Conversation).createdAt === 'string' &&
        typeof (conv as Conversation).updatedAt === 'string'
    );
}

/**
 * Chat History Page Component
 */
export default function ChatHistoryPage() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;

        async function loadConversations() {
            try {
                if (!mounted) return;

                setError(null);
                const data = await chatService.getUserConversations({ userId: DEFAULT_USER_ID });
                
                if (!mounted) return;

                if (!Array.isArray(data)) {
                    throw new Error('Invalid response format: expected an array');
                }

                const validConversations = data.filter(isValidConversation);
                setConversations(validConversations);
            } catch (error) {
                if (!mounted) return;
                
                console.error('Failed to load conversations:', error);
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
                    <Button 
                        onClick={() => window.location.reload()}
                        className="bg-primary text-primary-foreground shadow hover:bg-primary/90"
                    >
                        Try Again
                    </Button>
                </div>
            );
        }

        return <ConversationList conversations={conversations} />;
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