"use client"

import { useUser } from "@/app/providers/user-provider"
// import { ModelSelector } from "@/components/common/model-selector/base" // Not used in admin mode
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar" // Not used for admin user
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/components/ui/toast"
import { useChats } from "@/lib/chat-store/chats/provider"
import { useMessages } from "@/lib/chat-store/messages/provider"
import { clearAllIndexedDBStores } from "@/lib/chat-store/persist"
// import { MODEL_DEFAULT } from "@/lib/config" // Not used for preferred model
import { cn } from "@/lib/utils"
import {
  Bell,
  GearSix,
  Key,
  PaintBrush,
  // PlugsConnected, // Connections tab removed
  SignOut,
  User,
  X,
} from "@phosphor-icons/react"
import { useTheme } from "next-themes"
import { useRouter } from "next/navigation"
import type React from "react"
import { useState, useEffect } from "react" // useEffect removed
// import { ConnectionsSection } from "./connections-section" // Connections tab removed
import { LayoutSection } from "./layout-section"
import { SystemPromptSection } from "./system-prompt-section" // Re-instated for admin localStorage version

type SettingsContentProps = {
  onClose: () => void
  isDrawer?: boolean
}

type TabType = "general" | "appearance" | "providers" | "notifications"

interface LLMSettings {
  provider: string
  apiKeys: {
    openai: string
    anthropic: string
    google: string
    openrouter: string
  }
  defaultModel: string
  temperature: number
  maxTokens: number
  streamingEnabled: boolean
}

interface NotificationSettings {
  inAppNotifications: boolean
  gotifyEnabled: boolean
  gotifyUrl: string
  gotifyToken: string
}

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

  // LLM Settings State
  const [llmSettings, setLLMSettings] = useState<LLMSettings>({
    provider: "openai",
    apiKeys: {
      openai: "",
      anthropic: "",
      google: "",
      openrouter: "",
    },
    defaultModel: "gpt-4",
    temperature: 0.7,
    maxTokens: 1000,
    streamingEnabled: true,
  })

  // Notification Settings State
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    inAppNotifications: true,
    gotifyEnabled: false,
    gotifyUrl: "",
    gotifyToken: "",
  })

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedLLMSettings = localStorage.getItem('llm-settings')
    if (savedLLMSettings) {
      setLLMSettings(JSON.parse(savedLLMSettings))
    }

    const savedNotificationSettings = localStorage.getItem('notification-settings')
    if (savedNotificationSettings) {
      setNotificationSettings(JSON.parse(savedNotificationSettings))
    }
  }, [])

  // Save LLM settings
  const saveLLMSettings = () => {
    localStorage.setItem('llm-settings', JSON.stringify(llmSettings))
    toast({ title: "LLM settings saved", status: "success" })
  }

  // Save notification settings
  const saveNotificationSettings = () => {
    localStorage.setItem('notification-settings', JSON.stringify(notificationSettings))
    toast({ title: "Notification settings saved", status: "success" })
  }

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

  const llmProviders = [
    { id: "openai", name: "OpenAI" },
    { id: "anthropic", name: "Anthropic" },
    { id: "google", name: "Google" },
    { id: "openrouter", name: "OpenRouter" },
  ]

  const commonModels = [
    "gpt-4",
    "gpt-4-turbo",
    "gpt-3.5-turbo",
    "claude-3-sonnet",
    "claude-3-haiku",
    "gemini-pro",
    "gemini-pro-vision",
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
            <TabsContent value="general" className="space-y-6">
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

            <TabsContent value="providers" className="space-y-6">
              {/* LLM Provider Settings */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">LLM Provider Configuration</h3>
                
                {/* Default Provider */}
                <div className="space-y-2">
                  <Label htmlFor="provider-select">Default Provider</Label>
                  <Select
                    value={llmSettings.provider}
                    onValueChange={(value) => setLLMSettings(prev => ({ ...prev, provider: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {llmProviders.map((provider) => (
                        <SelectItem key={provider.id} value={provider.id}>
                          {provider.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* API Keys */}
                <div className="space-y-3">
                  <Label>API Keys</Label>
                  {llmProviders.map((provider) => (
                    <div key={provider.id} className="space-y-1">
                      <Label htmlFor={`${provider.id}-key`} className="text-xs text-muted-foreground">
                        {provider.name} API Key
                      </Label>
                      <Input
                        id={`${provider.id}-key`}
                        type="password"
                        placeholder={`Enter ${provider.name} API key`}
                        value={llmSettings.apiKeys[provider.id as keyof typeof llmSettings.apiKeys]}
                        onChange={(e) => setLLMSettings(prev => ({
                          ...prev,
                          apiKeys: { ...prev.apiKeys, [provider.id]: e.target.value }
                        }))}
                      />
                    </div>
                  ))}
                </div>

                {/* Model Settings */}
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="default-model">Default Model</Label>
                    <Select
                      value={llmSettings.defaultModel}
                      onValueChange={(value) => setLLMSettings(prev => ({ ...prev, defaultModel: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select model" />
                      </SelectTrigger>
                      <SelectContent>
                        {commonModels.map((model) => (
                          <SelectItem key={model} value={model}>
                            {model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="temperature">Temperature: {llmSettings.temperature}</Label>
                    <input
                      id="temperature"
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={llmSettings.temperature}
                      onChange={(e) => setLLMSettings(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="max-tokens">Max Tokens</Label>
                    <Input
                      id="max-tokens"
                      type="number"
                      value={llmSettings.maxTokens}
                      onChange={(e) => setLLMSettings(prev => ({ ...prev, maxTokens: parseInt(e.target.value) }))}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="streaming"
                      checked={llmSettings.streamingEnabled}
                      onCheckedChange={(checked) => setLLMSettings(prev => ({ ...prev, streamingEnabled: checked }))}
                    />
                    <Label htmlFor="streaming">Enable Streaming</Label>
                  </div>
                </div>

                <Button onClick={saveLLMSettings} className="w-full">
                  Save LLM Settings
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-6">
              {/* Notification Settings */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Notification Settings</h3>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="in-app-notifications"
                    checked={notificationSettings.inAppNotifications}
                    onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, inAppNotifications: checked }))}
                  />
                  <Label htmlFor="in-app-notifications">Enable In-App Notifications</Label>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="gotify-enabled"
                      checked={notificationSettings.gotifyEnabled}
                      onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, gotifyEnabled: checked }))}
                    />
                    <Label htmlFor="gotify-enabled">Enable Gotify Notifications</Label>
                  </div>

                  {notificationSettings.gotifyEnabled && (
                    <div className="space-y-3 ml-6">
                      <div className="space-y-2">
                        <Label htmlFor="gotify-url">Gotify URL</Label>
                        <Input
                          id="gotify-url"
                          type="url"
                          placeholder="https://gotify.example.com"
                          value={notificationSettings.gotifyUrl}
                          onChange={(e) => setNotificationSettings(prev => ({ ...prev, gotifyUrl: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="gotify-token">Gotify Token</Label>
                        <Input
                          id="gotify-token"
                          type="password"
                          placeholder="Enter Gotify token"
                          value={notificationSettings.gotifyToken}
                          onChange={(e) => setNotificationSettings(prev => ({ ...prev, gotifyToken: e.target.value }))}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <Button onClick={saveNotificationSettings} className="w-full">
                  Save Notification Settings
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="appearance" className="space-y-6">
              {/* Theme selection */}
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
              {/* Layout selection */}
              <LayoutSection />
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

            <TabsContent value="providers" className="flex-1 space-y-6 p-1">
              {/* LLM Provider Settings */}
              <div className="space-y-6">
                <h3 className="text-lg font-medium">LLM Provider Configuration</h3>
                
                {/* Default Provider */}
                <div className="space-y-2">
                  <Label htmlFor="provider-select">Default Provider</Label>
                  <Select
                    value={llmSettings.provider}
                    onValueChange={(value) => setLLMSettings(prev => ({ ...prev, provider: value }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {llmProviders.map((provider) => (
                        <SelectItem key={provider.id} value={provider.id}>
                          {provider.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* API Keys */}
                <div className="space-y-4">
                  <Label className="text-sm font-medium">API Keys</Label>
                  <div className="grid grid-cols-2 gap-4">
                    {llmProviders.map((provider) => (
                      <div key={provider.id} className="space-y-2">
                        <Label htmlFor={`${provider.id}-key`} className="text-xs text-muted-foreground">
                          {provider.name} API Key
                        </Label>
                        <Input
                          id={`${provider.id}-key`}
                          type="password"
                          placeholder={`Enter ${provider.name} API key`}
                          value={llmSettings.apiKeys[provider.id as keyof typeof llmSettings.apiKeys]}
                          onChange={(e) => setLLMSettings(prev => ({
                            ...prev,
                            apiKeys: { ...prev.apiKeys, [provider.id]: e.target.value }
                          }))}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Model Settings */}
                <div className="space-y-4">
                  <Label className="text-sm font-medium">Model Configuration</Label>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="default-model">Default Model</Label>
                      <Select
                        value={llmSettings.defaultModel}
                        onValueChange={(value) => setLLMSettings(prev => ({ ...prev, defaultModel: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select model" />
                        </SelectTrigger>
                        <SelectContent>
                          {commonModels.map((model) => (
                            <SelectItem key={model} value={model}>
                              {model}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="max-tokens">Max Tokens</Label>
                      <Input
                        id="max-tokens"
                        type="number"
                        value={llmSettings.maxTokens}
                        onChange={(e) => setLLMSettings(prev => ({ ...prev, maxTokens: parseInt(e.target.value) }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="temperature">Temperature: {llmSettings.temperature}</Label>
                    <input
                      id="temperature"
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={llmSettings.temperature}
                      onChange={(e) => setLLMSettings(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                      className="w-full"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="streaming"
                      checked={llmSettings.streamingEnabled}
                      onCheckedChange={(checked) => setLLMSettings(prev => ({ ...prev, streamingEnabled: checked }))}
                    />
                    <Label htmlFor="streaming">Enable Streaming Completion</Label>
                  </div>
                </div>

                <Button onClick={saveLLMSettings} size="lg">
                  Save LLM Settings
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="notifications" className="flex-1 space-y-6 p-1">
              {/* Notification Settings */}
              <div className="space-y-6">
                <h3 className="text-lg font-medium">Notification Settings</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Switch
                      id="in-app-notifications"
                      checked={notificationSettings.inAppNotifications}
                      onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, inAppNotifications: checked }))}
                    />
                    <div>
                      <Label htmlFor="in-app-notifications" className="text-sm font-medium">
                        In-App Notifications
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Show notifications within the application
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Switch
                        id="gotify-enabled"
                        checked={notificationSettings.gotifyEnabled}
                        onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, gotifyEnabled: checked }))}
                      />
                      <div>
                        <Label htmlFor="gotify-enabled" className="text-sm font-medium">
                          Gotify Notifications
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Send notifications via Gotify server
                        </p>
                      </div>
                    </div>

                    {notificationSettings.gotifyEnabled && (
                      <div className="space-y-4 ml-8 p-4 border rounded-lg bg-muted/30">
                        <div className="space-y-2">
                          <Label htmlFor="gotify-url">Gotify Server URL</Label>
                          <Input
                            id="gotify-url"
                            type="url"
                            placeholder="https://gotify.example.com"
                            value={notificationSettings.gotifyUrl}
                            onChange={(e) => setNotificationSettings(prev => ({ ...prev, gotifyUrl: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="gotify-token">Gotify Application Token</Label>
                          <Input
                            id="gotify-token"
                            type="password"
                            placeholder="Enter your Gotify application token"
                            value={notificationSettings.gotifyToken}
                            onChange={(e) => setNotificationSettings(prev => ({ ...prev, gotifyToken: e.target.value }))}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <Button onClick={saveNotificationSettings} size="lg">
                  Save Notification Settings
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="appearance" className="flex-1 space-y-6 p-1">
              {/* Theme selection */}
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
              {/* Layout selection */}
              <LayoutSection />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  )
}
