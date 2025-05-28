import { Chat } from "@/app/components/chat/chat"
import { LayoutApp } from "@/app/components/layout/layout-app"
import { MessagesProvider } from "@/lib/chat-store/messages/provider"

export default async function Page() {
  // In admin-only mode, no authentication required
  return (
    <MessagesProvider>
      <LayoutApp>
        <Chat />
      </LayoutApp>
    </MessagesProvider>
  )
}
