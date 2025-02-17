"use client"

import type * as React from "react"
import { MessageSquare, Settings2, Server, BookOpen } from "lucide-react"
import { NavMain } from "./nav-main"
import { NavUser } from "./nav-user"
import { ModelSelector } from "./model-selector"
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail } from "@/components/ui/sidebar"
import { ThemeToggle } from "@/components/theme-toggle"

// Sample data
const data = {
  user: {
    name: "Jacob",
    email: "jmagar@gmail.com",
    avatar: undefined,
  } as { name: string; email: string; avatar?: string },
  navMain: [
    {
      title: "Chat",
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
          title: "Starred Messages",
          url: "/chat/starred",
        }
      ],
    },
    {
      title: "MCP",
      url: "#",
      icon: Server,
      items: [
        {
          title: "Dashboard",
          url: "/mcp",
        },
        {
          title: "Servers",
          url: "/mcp/servers",
        },
        {
          title: "Tools",
          url: "/mcp/tools",
        },
        {
          title: "Logs",
          url: "/mcp/logs",
        }
      ],
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
    }
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

