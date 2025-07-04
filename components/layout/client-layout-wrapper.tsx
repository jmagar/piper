"use client"

import { LayoutApp } from "@/components/layout/layout-app"

interface ClientLayoutWrapperProps {
  children: React.ReactNode
}

export function ClientLayoutWrapper({ children }: ClientLayoutWrapperProps) {
  return (
    <LayoutApp>
      {children}
    </LayoutApp>
  )
} 