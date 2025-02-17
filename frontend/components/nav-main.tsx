"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import { ChevronRight, LucideIcon } from "lucide-react"

interface NavItem {
  title: string
  url: string
  icon?: LucideIcon
  items?: NavItem[]
}

interface NavMainProps {
  items: NavItem[]
}

export function NavMain({ items }: NavMainProps) {
  const pathname = usePathname()
  const [openGroups, setOpenGroups] = React.useState<string[]>([])

  const toggleGroup = React.useCallback((title: string) => {
    setOpenGroups(prev => 
      prev.includes(title) 
        ? prev.filter(t => t !== title)
        : [...prev, title]
    )
  }, [])

  return (
    <nav className="flex flex-col gap-2 p-2">
      {items.map((item, index) => {
        const Icon = item.icon
        const isActive = pathname.startsWith(item.url)
        const isOpen = openGroups.includes(item.title)

        if (item.items) {
          return (
            <Collapsible
              key={index}
              open={isOpen}
              onOpenChange={() => toggleGroup(item.title)}
            >
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
                >
                  {Icon && <Icon className="h-4 w-4" />}
                  <span>{item.title}</span>
                  <ChevronRight 
                    className={cn(
                      "ml-auto h-4 w-4 transition-transform",
                      isOpen && "rotate-90"
                    )} 
                  />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 space-y-1 pl-6">
                  {item.items.map((subItem, subIndex) => (
                    <Link
                      key={subIndex}
                      href={subItem.url}
                      className={cn(
                        "block rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                        pathname === subItem.url && "bg-accent text-accent-foreground"
                      )}
                    >
                      {subItem.title}
                    </Link>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )
        }

        return (
          <Link
            key={index}
            href={item.url}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
              isActive && "bg-accent text-accent-foreground"
            )}
          >
            {Icon && <Icon className="h-4 w-4" />}
            <span>{item.title}</span>
          </Link>
        )
      })}
    </nav>
  )
}

