"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/app-layout";
import { ChatHistoryProvider } from "@/components/chat/history/chat-history-provider";
import { MessageSquare } from "lucide-react";

/**
 * ChatHistoryPage Component
 * Displays the chat history with a list of previous conversations
 * Integrates with the app's existing layout
 */
export default function ChatHistoryPage() {
  const router = useRouter();
  
  return (
    <ChatHistoryProvider>
      <AppLayout title="Chat History">
        <div className="flex h-full flex-col items-center justify-center p-8 text-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[hsl(var(--muted))]">
            <MessageSquare className="h-12 w-12 text-[hsl(var(--muted-foreground))]" />
          </div>
          <h1 className="mt-6 text-2xl font-semibold">Chat History</h1>
          <p className="mt-2 max-w-md text-[hsl(var(--muted-foreground))]">
            Select a conversation from the sidebar to view your chat history, or start a new conversation.
          </p>
          <button
            onClick={() => router.push("/chat/new")}
            className="mt-6 inline-flex items-center justify-center rounded-md bg-[hsl(var(--primary))] px-4 py-2 text-sm font-medium text-[hsl(var(--primary-foreground))] shadow transition-colors hover:bg-[hsl(var(--primary))]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2"
          >
            Start New Conversation
          </button>
        </div>
      </AppLayout>
    </ChatHistoryProvider>
  );
}