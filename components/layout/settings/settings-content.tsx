"use client"

import { useUser } from "@/app/providers/user-provider"
// import { ModelSelector } from "@/components/common/model-selector/base" // Not used in admin mode
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar" // Not used for admin user
import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input" // Moved to respective tabs
// import { Label } from "@/components/ui/label" // Moved to respective tabs
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select" // Moved to ProvidersSettingsTab
// import { Switch } from "@/components/ui/switch" // Moved to respective tabs
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
// import { toast } from "@/components/ui/toast" // Moved to respective tabs

// import { useMessages } from "@/lib/chat-store/messages/provider" // Moved to GeneralSettingsTab
// import { clearAllIndexedDBStores } from "@/lib/chat-store/persist" // Moved to GeneralSettingsTab
// import { MODEL_DEFAULT } from "@/lib/config" // Not used for preferred model// import { cn } from "@/lib/utils" // Moved to AppearanceSettingsTab
import {
  Bell,
  GearSix,
  Key,
  PaintBrush,
  // PlugsConnected, // Connections tab removed
  X,
} from "@phosphor-icons/react"
// import { useTheme } from "next-themes" // Moved to AppearanceSettingsTab
// import { useRouter } from "next/navigation" // Moved to GeneralSettingsTab
import type React from "react"
import { useState, useEffect } from "react" // useEffect for LLM/Notification settings will move
import { GeneralSettingsTab } from "./tabs/GeneralSettingsTab"
import { ProvidersSettingsTab } from "./tabs/ProvidersSettingsTab"
import { NotificationsSettingsTab } from "./tabs/NotificationsSettingsTab"
import { AppearanceSettingsTab } from "./tabs/AppearanceSettingsTab"
// import { ConnectionsSection } from "./connections-section" // Connections tab removed
// import { LayoutSection } from "./layout-section" // Moved to AppearanceSettingsTab
// import { SystemPromptSection } from "./system-prompt-section" // Moved to GeneralSettingsTab

type SettingsContentProps = {
  onClose: () => void
  isDrawer?: boolean
}

type TabType = "general" | "appearance" | "providers" | "notifications"

// LLMSettings interface moved to ProvidersSettingsTab

// NotificationSettings interface moved to NotificationsSettingsTab

export function SettingsContent({
  onClose,
  isDrawer = false,
}: SettingsContentProps) {
  const { user } = useUser() // signOut and updateUser removed // user prop passed to GeneralSettingsTab or consumed there
  // const { resetChats } = useChats() // Moved to GeneralSettingsTab
  // const { resetMessages } = useMessages() // Moved to GeneralSettingsTab
  const [activeTab, setActiveTab] = useState<TabType>("general")
  // const router = useRouter() // Moved to GeneralSettingsTab

  // LLM Settings State moved to ProvidersSettingsTab

  // Notification Settings State moved to NotificationsSettingsTab

  // Load settings from localStorage on mount
  useEffect(() => {
    // Logic for loading LLM settings moved to ProvidersSettingsTab

    // Logic for loading notification settings moved to NotificationsSettingsTab
  }, [])

  // saveLLMSettings function moved to ProvidersSettingsTab

  // saveNotificationSettings function moved to NotificationsSettingsTab

  // handleClearSessionData moved to GeneralSettingsTab

  // themes array moved to AppearanceSettingsTab

  // llmProviders and commonModels constants moved to ProvidersSettingsTab

  if (!user) return null // Should be the admin user

  return (
    <div
      className="flex w-full flex-col overflow-y-auto"
      // className={cn(
      //   "flex w-full flex-col overflow-y-auto",
      //   isDrawer ? "p-0 pb-16" : "py-0"
      // )}
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
        className="flex w-full flex-row"
        // className={cn(
        //   "flex w-full flex-row",
        //   isDrawer ? "" : "flex min-h-[400px]"
        // )}
      >
        {isDrawer ? (
          // Mobile version - tabs on top
          <div className="w-full px-6 py-4">
            <TabsList className="mb-4 grid w-full grid-cols-4 bg-transparent">
              <TabsTrigger value="general" className="flex items-center gap-1">
                <GearSix className="size-4" />
                <span className="hidden sm:inline">General</span>
              </TabsTrigger>
              <TabsTrigger value="providers" className="flex items-center gap-1">
                <Key className="size-4" />
                <span className="hidden sm:inline">Providers</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-1">
                <Bell className="size-4" />
                <span className="hidden sm:inline">Notifications</span>
              </TabsTrigger>
              <TabsTrigger value="appearance" className="flex items-center gap-1">
                <PaintBrush className="size-4" />
                <span className="hidden sm:inline">Appearance</span>
              </TabsTrigger>
            </TabsList>

            {/* Mobile tabs content */}
            <TabsContent value="general">
              <GeneralSettingsTab isMobileLayout={true} />
            </TabsContent>

            <TabsContent value="providers">
              <ProvidersSettingsTab isMobileLayout={true} />
            </TabsContent>

            <TabsContent value="notifications">
              <NotificationsSettingsTab isMobileLayout={true} />
            </TabsContent>

            <TabsContent value="appearance">
              <AppearanceSettingsTab isMobileLayout={true} />
            </TabsContent>
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
                value="providers"
                className="w-full justify-start gap-2 px-3 py-2"
              >
                <Key className="size-4" />
                <span>Providers</span>
              </TabsTrigger>
              <TabsTrigger
                value="notifications"
                className="w-full justify-start gap-2 px-3 py-2"
              >
                <Bell className="size-4" />
                <span>Notifications</span>
              </TabsTrigger>
              <TabsTrigger
                value="appearance"
                className="w-full justify-start gap-2 px-3 py-2"
              >
                <PaintBrush className="size-4" />
                <span>Appearance</span>
              </TabsTrigger>
            </TabsList>

            {/* Desktop tabs content */}
            <TabsContent value="general">
              <GeneralSettingsTab isMobileLayout={false} />
            </TabsContent>

            <TabsContent value="providers">
              <ProvidersSettingsTab isMobileLayout={false} />
            </TabsContent>

            <TabsContent value="notifications">
              <NotificationsSettingsTab isMobileLayout={false} />
            </TabsContent>

            <TabsContent value="appearance">
              <AppearanceSettingsTab isMobileLayout={false} />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  )
}
