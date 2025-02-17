"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider } from "@/components/ui/sidebar"
import { ChatInterface } from '@/components/chat-interface'

export default function NewChatPage() {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <main className="flex-1 w-full overflow-hidden">
          <div className="w-full h-full">
            <ChatInterface />
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
} 