"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/toast"

interface NotificationSettings {
  inAppNotifications: boolean
  gotifyNotifications: boolean
  gotifyUrl: string
  gotifyToken: string
}

interface NotificationsSettingsTabProps {
  isMobileLayout: boolean
}

export function NotificationsSettingsTab({ isMobileLayout }: NotificationsSettingsTabProps) {
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    inAppNotifications: true,
    gotifyNotifications: false,
    gotifyUrl: "",
    gotifyToken: "",
  })

  useEffect(() => {
    const savedNotificationSettings = localStorage.getItem('notification-settings')
    if (savedNotificationSettings) {
      setNotificationSettings(JSON.parse(savedNotificationSettings))
    }
  }, [])

  const saveNotificationSettings = () => {
    localStorage.setItem('notification-settings', JSON.stringify(notificationSettings))
    toast({ title: "Notification settings saved", status: "success" })
  }

  const commonContent = (
    <div className="space-y-6">
      <div>
        <h3 className={isMobileLayout ? "text-sm font-medium" : "text-lg font-medium"}>Notifications</h3>
        <p className="text-muted-foreground text-xs">
          Manage how you receive notifications.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <Label htmlFor="in-app-notifications" className="text-sm font-medium">
              In-App Notifications
            </Label>
            <p className="text-muted-foreground text-xs">
              Receive notifications within the application.
            </p>
          </div>
          <Switch
            id="in-app-notifications"
            checked={notificationSettings.inAppNotifications}
            onCheckedChange={(checked) =>
              setNotificationSettings((prev) => ({ ...prev, inAppNotifications: checked }))
            }
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <Label htmlFor="gotify-notifications" className="text-sm font-medium">
              Gotify Notifications
            </Label>
            <p className="text-muted-foreground text-xs">
              Receive notifications via your Gotify server.
            </p>
          </div>
          <Switch
            id="gotify-notifications"
            checked={notificationSettings.gotifyNotifications}
            onCheckedChange={(checked) =>
              setNotificationSettings((prev) => ({ ...prev, gotifyNotifications: checked }))
            }
          />
        </div>

        {notificationSettings.gotifyNotifications && (
          <div className="space-y-4 rounded-lg border p-4">
            <div className="space-y-2">
              <Label htmlFor="gotify-url">Gotify Server URL</Label>
              <Input
                id="gotify-url"
                placeholder="https://gotify.example.com"
                value={notificationSettings.gotifyUrl}
                onChange={(e) =>
                  setNotificationSettings((prev) => ({ ...prev, gotifyUrl: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gotify-token">Gotify App Token</Label>
              <Input
                id="gotify-token"
                type="password"
                placeholder="Enter Gotify app token"
                value={notificationSettings.gotifyToken}
                onChange={(e) =>
                  setNotificationSettings((prev) => ({ ...prev, gotifyToken: e.target.value }))
                }
              />
            </div>
          </div>
        )}
      </div>

      <Button onClick={saveNotificationSettings} className={isMobileLayout ? "w-full" : ""} size={isMobileLayout ? undefined : "lg"}>
        Save Notification Settings
      </Button>
    </div>
  )

  return isMobileLayout ? (
    <div className="space-y-6">{commonContent}</div>
  ) : (
    <div className="flex-1 space-y-6 p-1">{commonContent}</div>
  )
}
