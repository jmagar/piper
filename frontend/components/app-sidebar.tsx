"use client"

import * as React from "react"

import {
  BookOpen,
  Bot,
  Command,
  LifeBuoy,
  Send,
  SquareTerminal,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const data = {
  user: {
    name: "Piper",
    email: "piper@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Messages",
      url: "/chat",
      icon: SquareTerminal,
      isActive: true,
      items: [
        {
          title: "New",
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
      ],
    },
    {
      title: "Model Context Protocol",
      url: "#",
      icon: Bot,
      items: [
        {
          title: "Config",
          url: "#",
        },
        {
          title: "Servers",
          url: "#",
        },
        {
          title: "Logs",
          url: "#",
        },
      ],
    },
    {
      title: "Knowledge",
      url: "#",
      icon: BookOpen,
      items: [
        {
          title: "Search",
          url: "#",
        },
        {
          title: "Documents",
          url: "#",
        },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Documentation",
      url: "#",
      icon: LifeBuoy,
    },
    {
      title: "Github",
      url: "https://github.com/jmagar/piper",
      icon: Send,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="#">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Command className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Acme Inc</span>
                  <span className="truncate text-xs">Enterprise</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
