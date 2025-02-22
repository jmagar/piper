"use client";

import { useParams } from 'next/navigation';

import { ChatV2 } from "@/components/chat/chat-v2";
import { SocketProvider } from "@/lib/socket";

export default function ChatPage() {
  const params = useParams();
  const conversationId = params.id as string;

  return (
    <div className="flex flex-col h-full bg-[hsl(var(--background))]">
      <SocketProvider>
        <ChatV2 conversationId={conversationId} />
      </SocketProvider>
    </div>
  );
} 