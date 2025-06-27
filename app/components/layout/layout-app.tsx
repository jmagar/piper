"use client"

import { Header } from "@/app/components/layout/header"
import { AppSidebar } from "@/app/components/layout/sidebar/app-sidebar"
import { useUserPreferences } from "@/app/providers/user-preferences-provider"
import { useChats } from "@/lib/chat-store/chats/provider"
import { AnimatePresence, motion } from "framer-motion"
import {
  FolderOpen,
  MessageSquare,
  TerminalSquare,
  Wrench,
  Users,
  X,
} from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"

const navItems = [
  { value: "chat", label: "Chat", Icon: MessageSquare },
  { value: "mcp", label: "MCP", Icon: Wrench },
  { value: "agents", label: "Agents", Icon: Users },
  { value: "prompts", label: "Prompts", Icon: TerminalSquare },
  { value: "files", label: "Files", Icon: FolderOpen },
]

const menuVariants = {
  open: {
    transition: { staggerChildren: 0.07, delayChildren: 0.2 },
  },
  closed: {
    transition: { staggerChildren: 0.05, staggerDirection: -1 },
  },
}

const itemVariants = {
  open: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 40,
    },
  },
  closed: {
    y: 50,
    opacity: 0,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 40,
    },
  },
}

export function LayoutApp({ children }: { children: React.ReactNode }) {
  const { preferences } = useUserPreferences()
  const hasSidebar = preferences.layout === "sidebar"

  const pathname = usePathname()
  const router = useRouter()
  const { activeChatId } = useChats()
  const [isOpen, setIsOpen] = useState(false)

  const getActiveTab = () => {
    for (const item of navItems) {
      if (item.value === "chat") {
        if (pathname === "/" || pathname.startsWith("/c/")) return item.value
      } else if (pathname.startsWith(`/${item.value}`)) {
        return item.value
      }
    }
    if (pathname.startsWith("/mcp-dashboard")) return "mcp" // Legacy fallback
    return "chat" // Default to chat
  }
  const activeTabValue = getActiveTab()
  const activeItem = navItems.find(item => item.value === activeTabValue)

  const handleTabChange = (value: string) => {
    setIsOpen(false)
    if (value === "chat") {
      if (activeChatId) {
        router.push(`/c/${activeChatId}`)
      } else {
        router.push("/")
      }
    } else if (value === "mcp") {
      router.push("/mcp-dashboard")
    } else {
      router.push(`/${value}`)
    }
  }

  return (
    <div className="bg-background flex h-dvh w-full overflow-hidden">
      <AppSidebar />
      <main className="@container relative h-dvh w-0 flex-shrink flex-grow overflow-y-auto">
        <Header hasSidebar={hasSidebar} />
        {children}
      </main>

      <div className="pointer-events-auto absolute bottom-4 right-4 z-[100] flex flex-col items-end gap-3">
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial="closed"
              animate="open"
              exit="closed"
              variants={menuVariants}
              className="flex flex-col items-end gap-3"
            >
              {navItems
                .filter(item => item.value !== activeTabValue)
                .map(({ value, label, Icon }) => (
                  <motion.div key={value} variants={itemVariants} className="w-full">
                    <Button
                      onClick={() => handleTabChange(value)}
                      className="h-12 w-full min-w-[140px] justify-start gap-3 rounded-lg bg-background/80 px-4 py-2 text-foreground shadow-lg backdrop-blur-sm transition-colors duration-300 hover:bg-accent/90"
                      variant="outline"
                    >
                      <Icon className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium text-sm">{label}</span>
                    </Button>
                  </motion.div>
                ))}
            </motion.div>
          )}
        </AnimatePresence>

        <Button
          onClick={() => setIsOpen(!isOpen)}
          className="flex h-14 w-14 items-center justify-center rounded-full border border-border/50 bg-background/80 text-foreground shadow-lg backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          aria-label={isOpen ? "Close navigation" : "Open navigation"}
        >
          {isOpen ? (
            <X className="h-7 w-7" />
          ) : (
            activeItem && <activeItem.Icon className="h-7 w-7" />
          )}
        </Button>
      </div>
    </div>
  )
}
