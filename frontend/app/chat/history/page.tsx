"use client"

import { useEffect, useState } from "react"

import Link from "next/link"

import { format } from "date-fns"
import { MessageSquare, ArrowRight, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { AppSidebar } from "@/components/app-sidebar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { SidebarProvider } from "@/components/ui/sidebar"



interface Conversation {
    id: string;
    title?: string;
    summary?: string;
    lastMessageAt: string;
    messageCount: number;
}

export default function ChatHistoryPage() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadConversations() {
            try {
                const response = await fetch('/api/chat/conversations/test-user-1');
                if (!response.ok) throw new Error('Failed to load conversations');
                const data = await response.json();
                setConversations(data);
            } catch (error) {
                console.error('Error loading conversations:', error);
                toast.error('Failed to load chat history');
            } finally {
                setLoading(false);
            }
        }

        loadConversations();
    }, []);

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
                            {loading ? (
                                <div className="flex items-center justify-center h-full">
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                </div>
                            ) : conversations.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full gap-4">
                                    <MessageSquare className="w-12 h-12 text-muted-foreground" />
                                    <div className="text-center">
                                        <h3 className="text-lg font-semibold">No conversations yet</h3>
                                        <p className="text-sm text-muted-foreground">
                                            Start a new chat to begin
                                        </p>
                                    </div>
                                    <Button asChild>
                                        <Link href="/chat/new">
                                            Start New Chat
                                        </Link>
                                    </Button>
                                </div>
                            ) : (
                                <div className="grid gap-4">
                                    {conversations.map((conversation) => (
                                        <Link 
                                            key={conversation.id} 
                                            href={`/chat/${conversation.id}`}
                                        >
                                            <Card className="p-4 hover:shadow-md transition-all cursor-pointer">
                                                <div className="flex items-start justify-between">
                                                    <div className="space-y-1">
                                                        <h3 className="font-medium">
                                                            {conversation.title || 'Untitled Conversation'}
                                                        </h3>
                                                        {conversation.summary ? <p className="text-sm text-muted-foreground line-clamp-2">
                                                                {conversation.summary}
                                                            </p> : null}
                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                            <span>
                                                                {format(new Date(conversation.lastMessageAt), 'PPp')}
                                                            </span>
                                                            <span>•</span>
                                                            <span>
                                                                {conversation.messageCount} messages
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                                                </div>
                                            </Card>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </SidebarProvider>
    )
} 