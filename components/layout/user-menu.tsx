"use client"

import { useUser } from "@/app/providers/user-provider"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { SettingsTrigger } from "./settings/settings-trigger"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

export function UserMenu() {
  const { setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const { user } = useUser()

  if (!user || !mounted) return null

  return (
    // fix shadcn/ui / radix bug when dialog into dropdown menu
    <DropdownMenu modal={false}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger className="transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-full">
            <Avatar className="bg-background hover:bg-muted border-2 border-border/50 hover:border-primary/50 transition-all duration-200 shadow-md hover:shadow-lg w-9 h-9">
              <AvatarImage src={user?.profile_image ?? undefined} />
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-foreground font-semibold text-sm">
                {user?.display_name?.charAt(0)}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="bg-popover border-border text-popover-foreground">
          Profile & Settings
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent
        className="w-64 bg-background/95 backdrop-blur-sm border-border/50 shadow-xl p-2"
        align="end"
        forceMount
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <DropdownMenuItem className="flex flex-col items-start gap-1 p-3 rounded-lg hover:bg-accent/50 focus:bg-accent/50 cursor-default">
          <span className="font-semibold text-foreground">{user?.display_name}</span>
          <span className="text-xs text-muted-foreground">Signed in</span>
        </DropdownMenuItem>
        
        <div className="h-px bg-border/50 my-2" />
        
        <div className="space-y-1">
          <SettingsTrigger />
          
          <div className="h-px bg-border/30 my-2" />
          
          <div className="px-2 py-1">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Theme</span>
          </div>
          
          <DropdownMenuItem 
            onClick={() => setTheme("light")} 
            className="rounded-lg hover:bg-accent/50 focus:bg-accent/50 transition-colors duration-150 cursor-pointer"
          >
            <Sun className="mr-3 h-4 w-4 text-amber-500" />
            <span className="font-medium">Light</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={() => setTheme("dark")} 
            className="rounded-lg hover:bg-accent/50 focus:bg-accent/50 transition-colors duration-150 cursor-pointer"
          >
            <Moon className="mr-3 h-4 w-4 text-blue-400" />
            <span className="font-medium">Dark</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={() => setTheme("system")} 
            className="rounded-lg hover:bg-accent/50 focus:bg-accent/50 transition-colors duration-150 cursor-pointer"
          >
            <div className="mr-3 h-4 w-4 rounded-sm border-2 border-foreground/25 flex items-center justify-center bg-gradient-to-br from-foreground/10 to-foreground/5">
              <div className="h-1.5 w-1.5 rounded-sm bg-foreground/60" />
            </div>
            <span className="font-medium">System</span>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
