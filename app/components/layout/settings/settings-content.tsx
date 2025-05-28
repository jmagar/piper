"use client"

import { useUser } from "@/app/providers/user-provider"
// import { ModelSelector } from "@/components/common/model-selector/base" // Not used in admin mode
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar" // Not used for admin user
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/components/ui/toast"
import { useChats } from "@/lib/chat-store/chats/provider"
import { useMessages } from "@/lib/chat-store/messages/provider"
import { clearAllIndexedDBStores } from "@/lib/chat-store/persist"
// import { MODEL_DEFAULT } from "@/lib/config" // Not used for preferred model
import { cn } from "@/lib/utils"
import {
  GearSix,
  PaintBrush,
  // PlugsConnected, // Connections tab removed
  SignOut,
  User,
  X,
} from "@phosphor-icons/react"
import { useTheme } from "next-themes"
import { useRouter } from "next/navigation"
import type React from "react"
import { useState } from "react" // useEffect removed
// import { ConnectionsSection } from "./connections-section" // Connections tab removed
import { LayoutSection } from "./layout-section"
import { SystemPromptSection } from "./system-prompt-section" // Re-instated for admin localStorage version

type SettingsContentProps = {
  onClose: () => void
  isDrawer?: boolean
}

type TabType = "general" | "appearance" // "connections" removed

export function SettingsContent({
  onClose,
  isDrawer = false,
}: SettingsContentProps) {
  const { user } = useUser() // signOut and updateUser removed
  const { resetChats } = useChats()
  const { resetMessages } = useMessages()
  const { theme, setTheme } = useTheme()
  const [selectedTheme, setSelectedTheme] = useState(theme || "system")
  // selectedModelId and related logic removed
  const [activeTab, setActiveTab] = useState<TabType>("general")
  const router = useRouter()

  // useEffect for preferred_model removed

  // handleModelSelection removed

  const handleClearSessionData = async () => { // Renamed from handleSignOut
    try {
      await resetMessages()
      await resetChats()
      // await signOut() // signOut doesn't exist in admin-only UserContext
      await clearAllIndexedDBStores()
      router.push("/")
      toast({ title: "Session data cleared (Admin Mode)", status: "success" })
    } catch (e) {
      console.error("Clear session data failed:", e)
      toast({ title: "Failed to clear session data", status: "error" })
    }
  }

  const themes = [
    { id: "system", name: "System", colors: ["#ffffff", "#1a1a1a"] },
    { id: "light", name: "Light", colors: ["#ffffff"] },
    { id: "dark", name: "Dark", colors: ["#1a1a1a"] },
  ]

  if (!user) return null // Should be the admin user

  return (
    <div
      className={cn(
        "flex w-full flex-col overflow-y-auto",
        isDrawer ? "p-0 pb-16" : "py-0"
      )}
    >
      {isDrawer && (
        <div className="border-border mb-2 flex items-center justify-between border-b px-4 pb-2">
          <h2 className="text-lg font-medium">Settings</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as TabType)}
        className={cn(
          "flex w-full flex-row",
          isDrawer ? "" : "flex min-h-[400px]"
        )}
      >
        {isDrawer ? (
          // Mobile version - tabs on top
          <div className="w-full px-6 py-4">
            <TabsList className="mb-4 grid w-full grid-cols-2 bg-transparent"> {/* Adjusted to 2 cols */}
              <TabsTrigger value="general" className="flex items-center gap-2">
                <GearSix className="size-4" />
                <span>General</span>
              </TabsTrigger>
              <TabsTrigger
                value="appearance"
                className="flex items-center gap-2"
              >
                <PaintBrush className="size-4" />
                <span>Appearance</span>
              </TabsTrigger>
              {/* ConnectionsTrigger removed */}
            </TabsList>

            {/* Mobile tabs content */}
            <TabsContent value="general" className="space-y-0">
              {/* User Info */}
              <div className="mb-4">
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

              {/* Preferred model section removed */}
              {/* SystemPromptSection removed */}

              {/* Account Section for Admin */}
              <div className="py-4">
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
              <div className="py-4 border-t border-border mt-4">
                <SystemPromptSection />
              </div>
            </TabsContent>

            <TabsContent value="appearance" className="space-y-6">
              {/* Theme selection remains */}
              <div>
                <h3 className="mb-3 text-sm font-medium">Theme</h3>
                <div className="grid grid-cols-3 gap-4">
                  {themes.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className={cn(
                        "rounded-lg border-2 p-2 text-center",
                        selectedTheme === t.id
                          ? "border-primary"
                          : "border-transparent hover:border-gray-300 dark:hover:border-gray-700"
                      )}
                      onClick={() => {
                        setSelectedTheme(t.id)
                        setTheme(t.id)
                      }}
                    >
                      <div className="mb-1 flex justify-center space-x-1">
                        {t.colors.map((color) => (
                          <div
                            key={color}
                            className="size-5 rounded-full border border-gray-300 dark:border-gray-700"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <span className="text-xs">{t.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              {/* Layout selection remains */}
              <LayoutSection />
            </TabsContent>

            {/* ConnectionsContent removed */}
          </div>
        ) : (
          // Desktop version - tabs on left
          <>
            <TabsList className="mr-6 flex h-auto flex-col items-start justify-start space-y-1 bg-transparent p-0">
              <TabsTrigger
                value="general"
                className="w-full justify-start gap-2 px-3 py-2"
              >
                <GearSix className="size-4" />
                <span>General</span>
              </TabsTrigger>
              <TabsTrigger
                value="appearance"
                className="w-full justify-start gap-2 px-3 py-2"
              >
                <PaintBrush className="size-4" />
                <span>Appearance</span>
              </TabsTrigger>
              {/* ConnectionsTrigger removed */}
            </TabsList>

            {/* Desktop tabs content */}
            <TabsContent value="general" className="flex-1 space-y-6 p-1">
              {/* User Info */}
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
              
              {/* Preferred model section removed */}
              {/* SystemPromptSection removed */}

              {/* Account Section for Admin */}
              <div className="border-border border-t pt-6">
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
              <div className="border-t border-border pt-6">
                <SystemPromptSection />
              </div>
            </TabsContent>

            <TabsContent value="appearance" className="flex-1 space-y-6 p-1">
              {/* Theme selection remains */}
              <div>
                <h3 className="mb-3 text-sm font-medium">Theme</h3>
                <div className="grid grid-cols-3 gap-4">
                  {themes.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className={cn(
                        "rounded-lg border-2 p-2 text-center",
                        selectedTheme === t.id
                          ? "border-primary"
                          : "border-transparent hover:border-gray-300 dark:hover:border-gray-700"
                      )}
                      onClick={() => {
                        setSelectedTheme(t.id)
                        setTheme(t.id)
                      }}
                    >
                      <div className="mb-1 flex justify-center space-x-1">
                        {t.colors.map((color) => (
                          <div
                            key={color}
                            className="size-5 rounded-full border border-gray-300 dark:border-gray-700"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <span className="text-xs">{t.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              {/* Layout selection remains */}
              <LayoutSection />
            </TabsContent>

            {/* ConnectionsContent removed */}
          </>
        )}
      </Tabs>
    </div>
  )
}
