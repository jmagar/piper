"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useTheme } from "next-themes"
// import { Button } from "@/components/ui/button" // Not used
import { LayoutSection } from "../layout-section"
import { cn } from "@/lib/utils"

const themes = [
  { id: "system", name: "System", colors: ["#ffffff", "#1a1a1a"] },
  { id: "light", name: "Light", colors: ["#ffffff"] },
  { id: "dark", name: "Dark", colors: ["#1a1a1a"] },
]

interface AppearanceSettingsTabProps {
  isMobileLayout: boolean
}

export function AppearanceSettingsTab({ isMobileLayout }: AppearanceSettingsTabProps) {
  const { theme, setTheme } = useTheme()
  const [selectedTheme, setSelectedTheme] = useState(theme || "system")

  useEffect(() => {
    setSelectedTheme(theme || "system")
  }, [theme])

  const handleThemeChange = (newTheme: string) => {
    setSelectedTheme(newTheme)
    setTheme(newTheme)
  }

  const commonContent = (
    <div className="space-y-6">
      <div>
        <h3 className={isMobileLayout ? "mb-3 text-sm font-medium" : "text-lg font-medium"}>Theme</h3>
        <div className={isMobileLayout ? "grid grid-cols-3 gap-4" : "grid grid-cols-3 gap-4 max-w-md"}>
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => handleThemeChange(t.id)}
              className={cn(
                "rounded-lg border p-4 text-center",
                selectedTheme === t.id && "ring-2 ring-primary ring-offset-2 ring-offset-background"
              )}
            >
              <div className="mb-2 flex justify-center space-x-1">
                {t.colors.map((color, index) => (
                  <span
                    key={index}
                    className="block size-5 rounded-full border"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <span className="text-xs font-medium">{t.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={isMobileLayout ? "py-4 border-t border-border" : "border-t border-border pt-6"}>
        <LayoutSection />
      </div>
    </div>
  )

  return isMobileLayout ? (
    <div className="space-y-6">{commonContent}</div>
  ) : (
    <div className="flex-1 space-y-6 p-1">{commonContent}</div>
  )
}
