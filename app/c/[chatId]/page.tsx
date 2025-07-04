import { Chat } from "@/components/chat/chat"
import { ClientLayoutWrapper } from "@/components/layout/client-layout-wrapper"
import { MessagesProvider } from "@/lib/chat-store/messages/provider"

export default async function Page() {
  // In admin-only mode, no authentication required
  return (
    <MessagesProvider>
      <ClientLayoutWrapper>
        <Chat />
      </ClientLayoutWrapper>
    </MessagesProvider>
  )
}
