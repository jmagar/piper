"use client"

import {
  BookOpen,
  Bot,
  ChevronDown,
  Command,
  LifeBuoy,
  SquareTerminal,
  PlusCircle,
  History,
  Star,
  Search,
  FileText,
  BarChart3,
  Settings,
  Zap,
  ExternalLink,
  Github,
} from "lucide-react"
import * as React from "react"
import { cn } from "@/lib/utils"

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
  SidebarProvider,
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
          icon: PlusCircle,
        },
        {
          title: "History",
          url: "/chat/history",
          icon: History,
        },
        {
          title: "Starred",
          url: "/chat/starred",
          icon: Star,
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
          icon: BarChart3,
        },
        {
          title: "Settings",
          url: "/mcp/settings",
          icon: Settings,
        },
        {
          title: "Performance",
          url: "/mcp/performance",
          icon: Zap,
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
          icon: Search,
        },
        {
          title: "Documents",
          url: "#",
          icon: FileText,
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
      icon: Github,
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
    <SidebarProvider>
      <Sidebar {...props} className="border-r">
        <SidebarHeader className="bg-background/95 backdrop-blur-sm">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <a href="#" className="flex justify-between w-full">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary text-primary-foreground flex aspect-square h-8 w-8 items-center justify-center rounded-lg">
                      <Command className="h-4 w-4" />
                    </div>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-medium">Acme Inc</span>
                      <span className="truncate text-xs text-muted-foreground">Enterprise</span>
                    </div>
                  </div>
                  <ThemeToggle />
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <div className="flex flex-col h-full">
            <SidebarMenu>
              {data.navMain.map((section) => (
                <SidebarMenuItem key={section.title}>
                  <SidebarMenuButton
                    onClick={() => toggleSection(section.title)}
                    className={cn(
                      "justify-between transition-colors",
                      section.isActive ? "text-primary font-medium" : "text-foreground/80"
                    )}
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
                    <SidebarMenu className="ml-4 mt-1 py-1 space-y-1">
                      {section.items.map((item) => (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton 
                            asChild
                            className="text-foreground/70 hover:text-primary transition-colors py-1.5"
                          >
                            <a href={item.url} className="flex items-center gap-2">
                              {item.icon && <item.icon className="h-3.5 w-3.5" />}
                              <span className="text-sm">{item.title}</span>
                              {item.url.startsWith('http') && (
                                <ExternalLink className="h-3 w-3 ml-auto opacity-50" />
                              )}
                            </a>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
            <div className="mt-auto pt-4 border-t border-border/50 mt-6">
              <SidebarMenu>
                {data.navSecondary.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <a 
                        href={item.url} 
                        className="flex items-center gap-2"
                        target={item.url.startsWith('http') ? "_blank" : undefined}
                        rel={item.url.startsWith('http') ? "noreferrer noopener" : undefined}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                        {item.url.startsWith('http') && (
                          <ExternalLink className="h-3 w-3 ml-auto opacity-50" />
                        )}
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </div>
          </div>
        </SidebarContent>
        <SidebarFooter className="bg-background/95 backdrop-blur-sm">
          <NavUser user={data.user} />
        </SidebarFooter>
      </Sidebar>
    </SidebarProvider>
  );
}
