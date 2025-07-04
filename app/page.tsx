"use client"

import { Chat } from "@/components/chat/chat"
import { LayoutApp } from "@/components/layout/layout-app"
import { MessagesProvider } from "@/lib/chat-store/messages/provider"
import React from "react" // Import React for Suspense

export const dynamic = "force-dynamic"

export default function Home() {
  return (
    <MessagesProvider>
      <LayoutApp>
        <React.Suspense fallback={<div>Loading chat...</div>}> {/* Or any other fallback UI */}
          <Chat />
        </React.Suspense>
      </LayoutApp>
    </MessagesProvider>
  )
}
