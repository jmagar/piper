"use client"

import { ChatErrorBoundary } from "@/app/components/error-boundary"
import { groupChatsByDate } from "@/app/components/history/utils"
import { useBreakpoint } from "@/app/hooks/use-breakpoint"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar"
import { useChats } from "@/lib/chat-store/chats/provider"
import {
  ChatTeardropText,
  GithubLogo,
  MagnifyingGlass,
  X,
} from "@phosphor-icons/react"
import { AnimatePresence, motion } from "motion/react"
import { useParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { HistoryTrigger } from "../../history/history-trigger"
import { ButtonNewChat } from "@/app/components/layout/button-new-chat"
import { SidebarList } from "./sidebar-list"

export function AppSidebar() {
  const isMobile = useBreakpoint(768)
  const { open, setOpenMobile } = useSidebar()
  const { chats, isLoading } = useChats()
  const params = useParams<{ chatId: string }>()
  const currentChatId = params.chatId
  
  // Hydration-safe loading state - always start with loading on server
  const [isHydrated, setIsHydrated] = useState(false)
  
  useEffect(() => {
    setIsHydrated(true)
  }, [])
  
  // Use hydration-safe loading state to prevent SSR/client mismatch
  const safeIsLoading = !isHydrated || isLoading

  const groupedChats = useMemo(() => {
    // Ensure chats is always an array before passing to groupChatsByDate
    const safeChats = Array.isArray(chats) ? chats : []
    return groupChatsByDate(safeChats, "")
  }, [chats])
  const hasChats = Array.isArray(chats) && chats.length > 0

  return (
    <Sidebar collapsible="offcanvas" variant="sidebar" className="border-none bg-background/95 backdrop-blur-sm shadow-lg">
      <SidebarHeader className="h-14 pl-3">
        <div className="flex justify-between">
          {isMobile ? (
            <button
              type="button"
              onClick={() => setOpenMobile(false)}
              className="text-muted-foreground hover:text-foreground hover:bg-muted inline-flex size-9 items-center justify-center rounded-md bg-transparent transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <X size={24} />
            </button>
          ) : (
            <div className="h-full" />
          )}
          <div className="flex items-center gap-2">
            <ButtonNewChat />
            <AnimatePresence mode="sync" initial={false}>
              {open && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.15, delay: 0.1, ease: "easeOut" }}
                className="pt-0"
              >
                <HistoryTrigger
                  hasSidebar={false}
                  classNameTrigger="text-muted-foreground hover:text-foreground hover:bg-muted inline-flex size-9 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none bg-transparent"
                  icon={<MagnifyingGlass size={24} />}
                />
              </motion.div>
            )}
          </AnimatePresence>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="mask-t-from-98% mask-t-to-100% mask-b-from-98% mask-b-to-100% px-3">
        <ScrollArea className="flex h-full rounded-xl border border-border/20 bg-background/50 backdrop-blur-sm shadow-sm [&>div>div]:!block">
          {safeIsLoading ? (
            <div className="h-full" />
          ) : hasChats ? (
            <ChatErrorBoundary>
              <div className="space-y-3 p-2">
                {groupedChats?.map((group) => (
                  <SidebarList
                    key={group.name}
                    title={group.name}
                    items={group.chats}
                    currentChatId={currentChatId}
                  />
                ))}
              </div>
            </ChatErrorBoundary>
          ) : (
            <div className="flex h-[calc(100vh-160px)] flex-col items-center justify-center">
              <ChatTeardropText
                size={24}
                className="text-muted-foreground mb-1 opacity-40"
              />
              <div className="text-muted-foreground text-center">
                <p className="mb-1 text-base font-medium">No chats yet</p>
                <p className="text-sm opacity-70">Start a new conversation</p>
              </div>
            </div>
          )}
        </ScrollArea>
      </SidebarContent>
      <SidebarFooter className="mb-2 p-3">
        <a
          href="https://github.com/jmagar/piper"
          className="hover:bg-muted flex items-center gap-2 rounded-xl p-3 transition-all duration-300 hover:shadow-md backdrop-blur-sm border border-transparent hover:border-border/30"
          target="_blank"
          aria-label="Star the repo on GitHub"
        >
          <div className="rounded-full border p-1">
            <GithubLogo className="size-4" />
          </div>
          <div className="flex flex-col">
            <div className="text-sidebar-foreground text-sm font-medium">
              Piper is open source
            </div>
            <div className="text-sidebar-foreground/70 text-xs">
              Star the repo on GitHub!
            </div>
          </div>
        </a>
      </SidebarFooter>
    </Sidebar>
  )
}
