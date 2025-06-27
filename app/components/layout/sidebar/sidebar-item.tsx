import { useBreakpoint } from "@/app/hooks/use-breakpoint"
import useClickOutside from "@/app/hooks/use-click-outside"
import { useChats } from "@/lib/chat-store/chats/provider"
import { cn } from "@/lib/utils"
import { Check, X } from "@phosphor-icons/react"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { SidebarItemMenu } from "./sidebar-item-menu"
import type { Chat } from "@/app/types/database.types"

type SidebarItemProps = {
  chat: Chat
  currentChatId: string
}

export function SidebarItem({ chat, currentChatId }: SidebarItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(chat.title)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { updateTitle } = useChats()
  const isMobile = useBreakpoint(768)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useClickOutside(containerRef, () => {
    if (isEditing) {
      handleSave()
    }
  })

  useEffect(() => {
    setEditTitle(chat.title)
  }, [chat.title])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleStartEditing = () => {
    setIsEditing(true)
  }

  const handleSave = async () => {
    setIsEditing(false)
    setIsMenuOpen(false)
    await updateTitle(chat.id, editTitle)
  }

  const handleCancel = () => {
    setEditTitle(chat.title)
    setIsEditing(false)
    setIsMenuOpen(false)
  }

  const handleMenuOpenChange = (open: boolean) => {
    setIsMenuOpen(open)
  }

  return (
    <div
      className={cn(
        "hover:bg-accent/60 hover:text-foreground hover:shadow-md group/chat relative w-full rounded-xl transition-all duration-300 backdrop-blur-sm border border-transparent hover:border-border/30",
        (chat.id === currentChatId || isEditing || isMenuOpen) &&
          "bg-accent/80 hover:bg-accent/90 text-foreground shadow-md border-border/30"
      )}
      onClick={(e) => {
        if (isEditing) {
          e.stopPropagation()
        }
      }}
      ref={containerRef}
    >
      {isEditing ? (
        <div className="bg-accent/90 flex items-center rounded-xl py-2 pr-2 pl-3 shadow-sm border border-border/50">
          <input
            ref={inputRef}
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="text-primary max-h-full w-full bg-transparent text-sm focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                handleSave()
              } else if (e.key === "Escape") {
                e.preventDefault()
                handleCancel()
              }
            }}
            autoFocus
          />
          <div className="flex gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleSave()
              }}
              className="hover:bg-secondary text-muted-foreground hover:text-primary flex size-7 items-center justify-center rounded-lg p-1 transition-all duration-200 hover:shadow-sm"
              type="button"
            >
              <Check size={16} weight="bold" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleCancel()
              }}
              className="hover:bg-secondary text-muted-foreground hover:text-primary flex size-7 items-center justify-center rounded-lg p-1 transition-all duration-200 hover:shadow-sm"
              type="button"
            >
              <X size={16} weight="bold" />
            </button>
          </div>
        </div>
      ) : (
        <>
          <Link
            href={`/c/${chat.id}`}
            className="block w-full"
            prefetch
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="text-primary relative line-clamp-1 mask-r-from-80% mask-r-to-85% px-3 py-2.5 text-sm text-ellipsis whitespace-nowrap"
              title={chat.title || "Untitled Chat"}
            >
              {chat.title || "Untitled Chat"}
            </div>
          </Link>

          <div
            className={cn(
              "absolute top-0 right-1 flex h-full items-center justify-center opacity-0 transition-opacity group-hover/chat:opacity-100",
              isMobile && "opacity-100 group-hover/chat:opacity-100"
            )}
            key={chat.id}
          >
            <SidebarItemMenu
              chat={chat}
              onStartEditing={handleStartEditing}
              onMenuOpenChange={handleMenuOpenChange}
            />
          </div>
        </>
      )}
    </div>
  )
}
