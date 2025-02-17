"use client"

import type * as React from "react"
import { MessageSquare, Settings2, Database, Server, Sparkles, CheckSquare, Terminal, BookOpen } from "lucide-react"

import { NavMain } from "./nav-main"
import { NavUser } from "./nav-user"
import { ModelSelector } from "./model-selector"
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail } from "@/components/ui/sidebar"
import { ThemeToggle } from "@/components/theme-toggle"

// This is sample data.
const data = {
  user: {
    name: "Jacob",
    email: "jmagar@gmail.com",
    avatar: undefined,
  } as { name: string; email: string; avatar?: string },
  navMain: [
    {
      title: "Messages",
      url: "#",
      icon: MessageSquare,
      items: [
        {
          title: "New Chat",
          url: "/chat/new",
        },
        {
          title: "History",
          url: "/chat/history",
        },
        {
          title: "Starred",
          url: "/chat/starred",
        },
        {
          title: "Stats",
          url: "/chat/stats",
        },
      ],
    },
    {
      title: "MCP",
      url: "#",
      icon: Server,
      items: [
        {
          title: "Logs",
          url: "/mcp/logs",
        },
        {
          title: "Config",
          url: "/mcp/config",
        },
        {
          title: "Tools",
          url: "/mcp/tools",
        },
        {
          title: "Servers",
          url: "/mcp/servers",
        },
      ],
    },
    {
      title: "Prompts",
      url: "#",
      icon: Sparkles,
      items: [
        {
          title: "New",
          url: "/prompts/new",
        },
        {
          title: "List",
          url: "/prompts/list",
        },
        {
          title: "Starred",
          url: "/prompts/starred",
        },
      ],
    },
    {
      title: "Knowledge Base",
      url: "#",
      icon: Database,
      items: [
        {
          title: "New",
          url: "/knowledge/new",
        },
        {
          title: "List",
          url: "/knowledge/list",
        },
        {
          title: "Starred",
          url: "/knowledge/starred",
        },
        {
          title: "Stats",
          url: "/knowledge/stats",
        },
      ],
    },
    {
      title: "Tasks",
      url: "#",
      icon: CheckSquare,
      items: [
        {
          title: "New",
          url: "/tasks/new",
        },
        {
          title: "List",
          url: "/tasks/list",
        },
        {
          title: "Starred",
          url: "/tasks/starred",
        },
        {
          title: "Status",
          url: "/tasks/status",
        },
        {
          title: "Stats",
          url: "/tasks/stats",
        },
      ],
    },
    {
      title: "Terminal",
      url: "/terminal",
      icon: Terminal,
    },
    {
      title: "Settings",
      url: "/settings",
      icon: Settings2,
    },
    {
      title: "Documentation",
      url: "/docs",
      icon: BookOpen,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <ModelSelector />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center justify-between px-4 py-2">
          <NavUser user={data.user} />
          <ThemeToggle />
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

