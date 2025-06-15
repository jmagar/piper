"use client"

import { HistoryTrigger } from "@/app/components/history/history-trigger"

import { UserMenu } from "@/app/components/layout/user-menu"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePathname, useRouter } from 'next/navigation';
import { useBreakpoint } from "@/app/hooks/use-breakpoint"
// import { useUser } from "@/app/providers/user-provider"
import type { Agent } from "@/app/types/agent"
import { useSidebar } from "@/components/ui/sidebar"
import { useAgent } from "@/lib/agent-store/provider";
import { useChats } from "@/lib/chat-store/chats/provider";
import { APP_NAME } from "@/lib/config"
import Link from "next/link"
import { DialogPublish } from "./dialog-publish"
import { HeaderSidebarTrigger } from "./header-sidebar-trigger"
import { MessageSquare, ToyBrick, Users, TerminalSquare, FolderOpen } from 'lucide-react';


export type AgentHeader = Pick<
  Agent,
  "name" | "description" | "avatar_url" | "slug"
>

export function Header({ hasSidebar }: { hasSidebar: boolean }) {
  const isMobile = useBreakpoint(768)
  const { open: isSidebarOpen } = useSidebar();
  const { currentAgent } = useAgent();
  const { activeChatId } = useChats(); // Get activeChatId
  const pathname = usePathname();
  const router = useRouter();

  const getActiveTab = () => {
    if (pathname.startsWith('/mcp-dashboard')) return 'mcp';
    if (pathname.startsWith('/agents')) return 'agents';
    if (pathname.startsWith('/prompts')) return 'prompts';
    if (pathname.startsWith('/files')) return 'files';
    if (pathname === '/' || pathname.startsWith('/c/')) return 'chat'; // Added Chat
    return ''; // Default or no active tab
  };

  const handleTabChange = (value: string) => {
    if (value === 'chat') {
      if (activeChatId) {
        router.push(`/c/${activeChatId}`);
      } else {
        router.push('/');
      }
    }
    if (value === 'mcp') router.push('/mcp-dashboard');
    if (value === 'agents') router.push('/agents');
    if (value === 'prompts') router.push('/prompts');
    if (value === 'files') router.push('/files');
  };

  return (
    <header className="h-app-header pointer-events-none fixed top-0 right-0 left-0 z-50">
      <div className="relative mx-auto flex h-full max-w-full items-center justify-between bg-transparent px-4 sm:px-6 lg:bg-transparent lg:px-8">
        <div className="flex flex-1 items-center justify-between">
          <div className="flex flex-1 items-center gap-2">
            <HeaderSidebarTrigger />
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
          <div className="pointer-events-auto flex flex-1 items-center justify-center gap-2">
            <Tabs value={getActiveTab()} onValueChange={handleTabChange} className="">
              <TabsList>
                {[
                  { value: 'chat', label: 'Chat', Icon: MessageSquare },
                  { value: 'mcp', label: 'MCP', Icon: ToyBrick },
                  { value: 'agents', label: 'Agents', Icon: Users },
                  { value: 'prompts', label: 'Prompts', Icon: TerminalSquare },
                  { value: 'files', label: 'Files', Icon: FolderOpen },
                ].map(({ value, label, Icon }) => (
                  <TabsTrigger key={value} value={value} className="px-2 md:px-3">
                    <Icon className={`h-5 w-5 ${!isMobile ? 'md:mr-2' : ''}`} />
                    {!isMobile && <span className="hidden md:inline">{label}</span>}
                    {isMobile && <span className="sr-only">{label}</span>} {/* For accessibility on mobile */}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
          <div className="pointer-events-auto flex items-center justify-end gap-2">
            {currentAgent && <DialogPublish />}
            {/* Removed individual links, HistoryTrigger and UserMenu remain right-aligned */}
            {!isSidebarOpen && <HistoryTrigger hasSidebar={hasSidebar} />}
            <UserMenu />
          </div>
        </div>
      </div>
    </header>
  )
}
