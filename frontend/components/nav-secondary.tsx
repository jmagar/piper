"use client"

import { LucideIcon } from "lucide-react"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar-new"

interface NavSecondaryItem {
  title: string
  url: string
  icon: LucideIcon
}

interface NavSecondaryProps {
  items: NavSecondaryItem[]
  className?: string
}

export function NavSecondary({ items, className }: NavSecondaryProps) {
  return (
    <SidebarMenu className={className}>
      {items.map((item) => (
        <SidebarMenuItem key={item.title}>
          <SidebarMenuButton asChild>
            <a href={item.url}>
              <item.icon className="h-4 w-4" />
              <span>{item.title}</span>
            </a>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  )
}
