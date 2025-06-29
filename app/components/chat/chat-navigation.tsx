"use client"

import { useChats } from "@/lib/chat-store/chats/provider"
import { AnimatePresence, motion } from "framer-motion"
import {
  FolderOpen,
  MessageSquare,
  TerminalSquare,
  Wrench,
  Users,
  X,
  LayoutDashboard,
} from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { useState, useEffect, useCallback } from "react"


const navItems = [
  { value: "chat", label: "Chat", Icon: MessageSquare, color: "from-blue-600 to-blue-700" },
  { value: "mcp", label: "MCP", Icon: Wrench, color: "from-orange-600 to-orange-700" },
  { value: "agents", label: "Agents", Icon: Users, color: "from-purple-600 to-purple-700" },
  { value: "prompts", label: "Prompts", Icon: TerminalSquare, color: "from-green-600 to-green-700" },
  { value: "files", label: "Files", Icon: FolderOpen, color: "from-pink-600 to-pink-700" },
]

const menuVariants = {
  open: {
    transition: { 
      staggerChildren: 0.08, 
      delayChildren: 0.15,
      ease: [0.4, 0.0, 0.2, 1]
    },
  },
  closed: {
    transition: { 
      staggerChildren: 0.03, 
      staggerDirection: -1,
      ease: [0.4, 0.0, 0.2, 1]
    },
  },
}

const itemVariants = {
  open: {
    y: 0,
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30,
      mass: 0.8,
    },
  },
  closed: {
    y: 30,
    opacity: 0,
    scale: 0.6,
    rotate: -10,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30,
      mass: 0.8,
    },
  },
}

const fabVariants = {
  default: { 
    rotate: 0, 
    scale: 1
  },
  open: { 
    rotate: 135, 
    scale: 1.1
  },
  hover: {
    scale: 1.15
  },
  dragging: {
    scale: 1.2,
    zIndex: 50
  }
}

export function ChatNavigation() {
  const pathname = usePathname()
  const router = useRouter()
  const { activeChatId } = useChats()
  const [isOpen, setIsOpen] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  const getActiveNav = useCallback(() => {
    if (pathname === "/" || pathname.startsWith("/c/")) {
      return "chat"
    }
    if (pathname.startsWith("/dashboard/manager")) {
      return "mcp"
    }
    if (pathname === "/settings") {
      return "settings"
    }

    const firstSegment = pathname.split("/")[1]
    if (firstSegment && navItems.some(item => item.value === firstSegment)) {
      return firstSegment
    }

    return "chat"
  }, [pathname])

  const activeTabValue = getActiveNav()
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
      router.push("/dashboard/manager")
    } else {
      router.push(`/${value}`)
    }
  }

  return (
    <>
      {/* Draggable Floating Action Button Container */}
      {isClient && (
        <motion.div
          drag
          dragMomentum={false}
          dragElastic={0.1}
          dragConstraints={{
            top: -window.innerHeight * 0.7,
            left: -window.innerWidth * 0.4,
            right: window.innerWidth * 0.4,
            bottom: window.innerHeight * 0.1,
          }}
          onDragStart={() => {
            setIsDragging(true)
            setIsOpen(false) // Close menu when dragging starts
          }}
          onDragEnd={() => setIsDragging(false)}
          className="fixed bottom-36 right-6 z-40"
          whileDrag={{ scale: 1.05 }}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          <div className="relative flex flex-col items-end gap-4">
            <AnimatePresence>
              {isOpen && !isDragging && (
                <motion.div
                  initial="closed"
                  animate="open"
                  exit="closed"
                  variants={menuVariants}
                  className="flex flex-col items-end gap-3 mb-3"
                >
                  {navItems
                    .filter(item => item.value !== activeTabValue)
                    .reverse() // Show from bottom to top
                    .map(({ value, label, Icon }) => (
                      <motion.div key={value} variants={itemVariants}>
                        <button
                          onClick={() => handleTabChange(value)}
                          className={`
                            group relative h-12 min-w-[130px] justify-start gap-3 rounded-2xl 
                            bg-black text-white hover:bg-gray-800
                            px-4 py-2 shadow-xl hover:shadow-2xl 
                            transition-all duration-500 hover:scale-105
                            border border-gray-700 overflow-hidden
                            flex items-center
                          `}
                        >
                          {/* Subtle hover glow */}
                          <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          
                          {/* Icon with clean styling */}
                          <div className="relative z-10 p-1.5 rounded-lg bg-white/10">
                            <Icon className="h-4 w-4 text-white drop-shadow-md" />
                          </div>
                          
                          {/* Label with clean typography */}
                          <span className="relative z-10 font-bold text-sm text-white drop-shadow-md">
                            {label}
                          </span>
                          
                          {/* Subtle border highlight */}
                          <div className="absolute inset-0 rounded-2xl border border-white/10 group-hover:border-white/20 transition-colors duration-300" />
                        </button>
                      </motion.div>
                    ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Enhanced Floating Action Button */}
            <motion.div
              variants={fabVariants}
              animate={
                isDragging ? "dragging" :
                isOpen ? "open" : 
                isHovering ? "hover" : 
                "default"
              }
              onHoverStart={() => !isDragging && setIsHovering(true)}
              onHoverEnd={() => setIsHovering(false)}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="relative"
            >
              {/* Drag indicator dots */}
              {isDragging && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute -top-2 -right-2 flex gap-0.5"
                >
                  <div className="w-1 h-1 bg-white/60 rounded-full" />
                  <div className="w-1 h-1 bg-white/60 rounded-full" />
                  <div className="w-1 h-1 bg-white/60 rounded-full" />
                </motion.div>
              )}
              
              <button
                onClick={() => !isDragging && setIsOpen(!isOpen)}
                className={`
                  relative h-16 w-16 rounded-full p-0 overflow-hidden
                  transition-all duration-300 flex items-center justify-center
                  bg-black text-white shadow-xl hover:shadow-2xl
                  ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}
                `}
                aria-label={isOpen ? "Close navigation" : "Open navigation"}
                style={{ 
                  border: 'none'
                }}
              >
                <AnimatePresence mode="wait">
                  {isOpen && !isDragging ? (
                    <motion.div
                      key="close"
                      initial={{ rotate: -90, scale: 0.5, opacity: 0 }}
                      animate={{ rotate: 0, scale: 1, opacity: 1 }}
                      exit={{ rotate: 90, scale: 0.5, opacity: 0 }}
                      transition={{ duration: 0.2, ease: [0.4, 0.0, 0.2, 1] }}
                    >
                      <X className="h-7 w-7 text-white drop-shadow-lg" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="icon"
                      initial={{ rotate: -90, scale: 0.5, opacity: 0 }}
                      animate={{ rotate: 0, scale: 1, opacity: 1 }}
                      exit={{ rotate: 90, scale: 0.5, opacity: 0 }}
                      transition={{ duration: 0.2, ease: [0.4, 0.0, 0.2, 1] }}
                      className="relative"
                    >
                      {activeItem ? (
                        <activeItem.Icon className="h-6 w-6 text-white drop-shadow-lg" />
                      ) : (
                        <LayoutDashboard className="h-7 w-7 text-white drop-shadow-lg" />
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            </motion.div>
          </div>
        </motion.div>
      )}
    </>
  )
}
