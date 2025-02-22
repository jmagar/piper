"use client"

import { Suspense } from "react"

import { Loader2 } from "lucide-react"

import { ChatV2 } from "@/components/chat/chat-v2"
import { SocketProvider } from "@/lib/socket"

function LoadingSpinner() {
  return (
    <div className="flex h-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--muted-foreground))]" />
    </div>
  )
}

export default function ChatV2Page() {
  return (
    <div className="flex flex-col h-full bg-[hsl(var(--background))]">
      <Suspense fallback={<LoadingSpinner />}>
        <SocketProvider>
          <ChatV2 />
        </SocketProvider>
      </Suspense>
    </div>
  )
} 