import { SidebarItem } from "./sidebar-item"
import type { Chat } from "@/app/types/database.types"

type SidebarListProps = {
  title: string
  items: Chat[]
  currentChatId: string
}

export function SidebarList({ title, items, currentChatId }: SidebarListProps) {
  return (
    <div className="bg-background/30 rounded-xl p-3 backdrop-blur-sm border border-border/20 shadow-sm">
      <h3 className="overflow-hidden px-2 pt-1 pb-3 text-xs font-medium break-all text-ellipsis text-muted-foreground">
        {title}
      </h3>
      <div className="space-y-1">
        {items.map((chat) => (
          <SidebarItem
            key={chat.id}
            chat={chat}
            currentChatId={currentChatId}
          />
        ))}
      </div>
    </div>
  )
}
