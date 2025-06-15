"use client"

import type React from "react"
import { useUser } from "@/app/providers/user-provider"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import { useChats } from "@/lib/chat-store/chats/provider"
import { useMessages } from "@/lib/chat-store/messages/provider"
import { clearAllIndexedDBStores } from "@/lib/chat-store/persist"
import { SystemPromptSection } from "../system-prompt-section"
import { User, SignOut } from "@phosphor-icons/react"
import { useRouter } from "next/navigation"

interface GeneralSettingsTabProps {
  isMobileLayout: boolean
}

export function GeneralSettingsTab({ isMobileLayout }: GeneralSettingsTabProps) {
  const { user } = useUser()
  const { resetChats } = useChats()
  const { resetMessages } = useMessages()
  const router = useRouter()

  const handleClearSessionData = async () => {
    try {
      await resetMessages()
      await resetChats()
      await clearAllIndexedDBStores()
      router.push("/")
      toast({ title: "Session data cleared (Admin Mode)", status: "success" })
    } catch (e) {
      console.error("Clear session data failed:", e)
      toast({ title: "Failed to clear session data", status: "error" })
    }
  }

  if (!user) return null

  const commonContent = (
    <>
      {/* User Info */}
      <div className={isMobileLayout ? "mb-4" : ""}>
        <div className="flex items-center space-x-4">
          <div className="bg-muted flex items-center justify-center overflow-hidden rounded-full">
            <User className="text-muted-foreground size-10" />
          </div>
          <div>
            <h3 className="text-sm font-medium">
              {user?.display_name} (Admin)
            </h3>
          </div>
        </div>
      </div>

      {/* Account Section for Admin */}
      <div className={isMobileLayout ? "py-4" : "border-border border-t pt-6"}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium">Account</h3>
            <p className="text-muted-foreground text-xs">
              Current user: Admin
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
            onClick={handleClearSessionData}
          >
            <SignOut className="size-4" />
            <span>Clear Session Data</span>
          </Button>
        </div>
      </div>

      {/* System Prompt Section for Admin */}
      <div className={isMobileLayout ? "py-4 border-t border-border mt-4" : "border-t border-border pt-6"}>
        <SystemPromptSection />
      </div>
    </>
  )

  return isMobileLayout ? (
    <div className="space-y-6">{commonContent}</div>
  ) : (
    <div className="flex-1 space-y-6 p-1">{commonContent}</div>
  )
}
