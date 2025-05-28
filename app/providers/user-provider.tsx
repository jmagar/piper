"use client"

import { createContext, useContext, ReactNode } from "react"

// Admin-only user for single-admin application
const ADMIN_USER = {
  id: "admin",
  display_name: "Admin",
  profile_image: "",
  system_prompt: null,
  anonymous: false,
  createdAt: new Date(),
  updatedAt: new Date(),
}

interface UserContextType {
  user: typeof ADMIN_USER
  isLoading: boolean
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: ReactNode }) {
  return (
    <UserContext.Provider
      value={{
        user: ADMIN_USER,
        isLoading: false,
      }}
    >
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider")
  }
  return context
} 