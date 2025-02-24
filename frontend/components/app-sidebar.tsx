"use client"

import {
  BookOpen,
  Bot,
  ChevronDown,
  Command,
  LifeBuoy,
  Send,
  SquareTerminal,
} from "lucide-react"
import * as React from "react"
import { cn } from "@/lib/utils"

import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar-new"

const data = {
  user: {
    name: "Piper",
    email: "piper@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Messages",
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
      icon: Bot,
      items: [
        {
          title: "Logs",
          url: "/mcp/logs",
        },
      ],
    },
    {
      title: "Knowledge",
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
  const [expandedSections, setExpandedSections] = React.useState<string[]>([]);

  const toggleSection = (title: string) => {
    setExpandedSections(prev => 
      prev.includes(title) 
        ? prev.filter(t => t !== title)
        : [...prev, title]
    );
  };

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="#">
                <div className="bg-primary text-primary-foreground flex aspect-square h-8 w-8 items-center justify-center rounded-lg">
                  <Command className="h-4 w-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Acme Inc</span>
                  <span className="truncate text-xs text-muted-foreground">Enterprise</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {data.navMain.map((section) => (
            <SidebarMenuItem key={section.title}>
              <SidebarMenuButton
                onClick={() => toggleSection(section.title)}
                className="justify-between"
              >
                <div className="flex items-center gap-2">
                  <section.icon className="h-4 w-4" />
                  <span>{section.title}</span>
                </div>
                <ChevronDown 
                  className={cn(
                    "h-4 w-4 transition-transform",
                    expandedSections.includes(section.title) && "rotate-180"
                  )} 
                />
              </SidebarMenuButton>
              {expandedSections.includes(section.title) && (
                <SidebarMenu className="ml-4 mt-1">
                  {section.items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <a href={item.url}>
                          {item.title}
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              )}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <div className="px-4 py-2">
          <ThemeToggle />
        </div>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  );
}
