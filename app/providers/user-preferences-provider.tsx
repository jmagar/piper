"use client"

import { createContext, useContext, useEffect, useState } from "react"

export type LayoutType = "sidebar" | "fullscreen"

type UserPreferences = {
  layout: LayoutType
}

const defaultPreferences: UserPreferences = {
  layout: "fullscreen", // Default to fullscreen, can be overridden by localStorage
}

const PREFERENCES_STORAGE_KEY = "user-preferences"
const LAYOUT_STORAGE_KEY = "preferred-layout" // Kept for potential backward compatibility if users had this set

interface UserPreferencesContextType {
  preferences: UserPreferences
  setLayout: (layout: LayoutType) => void
}

const UserPreferencesContext = createContext<
  UserPreferencesContextType | undefined
>(undefined)

export function UserPreferencesProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [preferences, setPreferences] =
    useState<UserPreferences>(defaultPreferences)
  const [isInitialized, setIsInitialized] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)

  // Hydration effect - runs only on client after hydration
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    // Only run after hydration to prevent SSR/client mismatch
    if (!isHydrated) return

    // Always try to load from localStorage since there's no auth gate
    try {
      const storedPrefs = localStorage.getItem(PREFERENCES_STORAGE_KEY)
      if (storedPrefs) {
        setPreferences(JSON.parse(storedPrefs))
      } else {
        // Fallback to old layout key if new one isn't present
        const storedLayout = localStorage.getItem(
          LAYOUT_STORAGE_KEY
        ) as LayoutType
        if (storedLayout) {
          setPreferences((prev) => ({ ...prev, layout: storedLayout }))
        }
      }
    } catch (error) {
      console.error("Failed to load user preferences:", error)
      // Stick with defaultPreferences if loading fails
    } finally {
      setIsInitialized(true)
    }
  }, [isHydrated])

  useEffect(() => {
    if (isInitialized) { // Save whenever initialized and preferences change
      try {
        localStorage.setItem(
          PREFERENCES_STORAGE_KEY,
          JSON.stringify(preferences)
        )
        // Also update the old key for a smoother transition if needed, or remove if not necessary
        localStorage.setItem(LAYOUT_STORAGE_KEY, preferences.layout)
      } catch (error) {
        console.error("Failed to save user preferences:", error)
      }
    }
  }, [preferences, isInitialized])

  const setLayout = (layout: LayoutType) => {
    // Always allow setting layout
    setPreferences((prev) => ({ ...prev, layout }))
  }

  return (
    <UserPreferencesContext.Provider
      value={{
        preferences,
        setLayout,
      }}
    >
      {children}
    </UserPreferencesContext.Provider>
  )
}

export function useUserPreferences() {
  const context = useContext(UserPreferencesContext)
  if (context === undefined) {
    throw new Error(
      "useUserPreferences must be used within a UserPreferencesProvider"
    )
  }
  return context
}
