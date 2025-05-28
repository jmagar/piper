"use client"

import { HistoryTrigger } from "@/app/components/history/history-trigger"
import { ButtonNewChat } from "@/app/components/layout/button-new-chat"
import { UserMenu } from "@/app/components/layout/user-menu"
import { useBreakpoint } from "@/app/hooks/use-breakpoint"
// import { useUser } from "@/app/providers/user-provider"
import type { Agent } from "@/app/types/agent"
import { useSidebar } from "@/components/ui/sidebar"
import { useAgent } from "@/lib/agent-store/provider"
import { APP_NAME } from "@/lib/config"
import Link from "next/link"
import { AgentLink } from "./agent-link"
import { DialogPublish } from "./dialog-publish"
import { HeaderSidebarTrigger } from "./header-sidebar-trigger"

export type AgentHeader = Pick<
  Agent,
  "name" | "description" | "avatar_url" | "slug"
>

export function Header({ hasSidebar }: { hasSidebar: boolean }) {
  const isMobile = useBreakpoint(768)
  const { open: isSidebarOpen } = useSidebar()
  const { currentAgent } = useAgent()

  return (
    <header className="h-app-header pointer-events-none fixed top-0 right-0 left-0 z-50">
      <div className="relative mx-auto flex h-full max-w-full items-center justify-between bg-transparent px-4 sm:px-6 lg:bg-transparent lg:px-8">
        <div className="flex flex-1 items-center justify-between">
          <div className="flex flex-1 items-center gap-2">
            {hasSidebar && <HeaderSidebarTrigger />}
            {Boolean(!currentAgent || !isMobile) && (
              <div className="flex-1">
                <Link
                  href="/"
                  className="pointer-events-auto text-xl font-medium tracking-tight"
                >
                  {APP_NAME}
                </Link>
              </div>
            )}
          </div>
          <div />
          <div className="pointer-events-auto flex flex-1 items-center justify-end gap-2">
            {currentAgent && <DialogPublish />}
            <ButtonNewChat />
            <AgentLink />
            {!isSidebarOpen && <HistoryTrigger hasSidebar={hasSidebar} />}
            <UserMenu />
          </div>
        </div>
      </div>
    </header>
  )
}
