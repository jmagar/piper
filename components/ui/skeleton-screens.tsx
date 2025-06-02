'use client'

import { cn } from '@/lib/utils'

// Base skeleton component
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted', className)}
      {...props}
    />
  )
}

// Chat message skeleton
export function SkeletonMessage({ 
  isUser = false, 
  className = '' 
}: { 
  isUser?: boolean
  className?: string 
}) {
  return (
    <div className={cn('flex gap-3 p-4', isUser && 'flex-row-reverse', className)}>
      {/* Avatar skeleton */}
      <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
      
      {/* Message content */}
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-12" />
        </div>
        <div className="space-y-1">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-3/5" />
        </div>
      </div>
    </div>
  )
}

// Multiple chat messages skeleton
export function SkeletonChatMessages({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonMessage 
          key={i} 
          isUser={i % 2 === 0} 
        />
      ))}
    </div>
  )
}

// Chat list item skeleton
export function SkeletonChatItem({ className = '' }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-3 p-3 rounded-lg', className)}>
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-3 w-48" />
      </div>
    </div>
  )
}

// Chat list skeleton
export function SkeletonChatList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonChatItem key={i} />
      ))}
    </div>
  )
}

// Chat input skeleton
export function SkeletonChatInput({ className = '' }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2 p-4 border-t', className)}>
      <div className="flex-1">
        <Skeleton className="h-10 w-full rounded-md" />
      </div>
      <Skeleton className="h-10 w-20 rounded-md" />
    </div>
  )
}

// Full chat interface skeleton
export function SkeletonChatInterface() {
  return (
    <div className="flex h-screen">
      {/* Sidebar skeleton */}
      <div className="w-80 border-r p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
        <Skeleton className="h-10 w-full rounded-md" />
        <SkeletonChatList count={6} />
      </div>
      
      {/* Main chat area skeleton */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </div>
        
        {/* Messages */}
        <div className="flex-1 overflow-hidden">
          <SkeletonChatMessages count={4} />
        </div>
        
        {/* Input */}
        <SkeletonChatInput />
      </div>
    </div>
  )
}

// Loading card skeleton
export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={cn('rounded-lg border p-4 space-y-3', className)}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-20 rounded-md" />
        <Skeleton className="h-8 w-16 rounded-md" />
      </div>
    </div>
  )
}

// Agent/Model selector skeleton
export function SkeletonModelSelector({ className = '' }: { className?: string }) {
  return (
    <div className={cn('space-y-3', className)}>
      <Skeleton className="h-4 w-24" />
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex items-center gap-2 p-2 border rounded-md">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}

// Dashboard skeleton
export function SkeletonDashboard() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32 rounded-md" />
      </div>
      
      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }, (_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
      
      {/* Content sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Skeleton className="h-6 w-32" />
          <SkeletonChatList count={3} />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-6 w-28" />
          <SkeletonModelSelector />
        </div>
      </div>
    </div>
  )
}

// PWA specific skeletons
export function SkeletonInstallPrompt({ className = '' }: { className?: string }) {
  return (
    <div className={cn('rounded-lg border p-4 space-y-3 bg-blue-50 dark:bg-blue-900/20', className)}>
      <div className="flex items-start gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-8 rounded" />
          </div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
        </div>
        <Skeleton className="h-8 w-8 rounded-md" />
      </div>
      <div className="flex items-center gap-2 pt-2 border-t">
        <Skeleton className="h-8 flex-1 rounded-md" />
        <Skeleton className="h-8 w-20 rounded-md" />
      </div>
    </div>
  )
}

// Offline sync status skeleton
export function SkeletonSyncStatus({ className = '' }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2 p-2 rounded-md bg-yellow-50 dark:bg-yellow-900/20', className)}>
      <Skeleton className="h-4 w-4 rounded-full" />
      <Skeleton className="h-3 w-32" />
      <Skeleton className="h-6 w-16 rounded" />
    </div>
  )
}

// Loading screen for initial app load
export function SkeletonAppLoad() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header skeleton */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between max-w-screen-xl mx-auto">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-6 w-24" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <div className="max-w-screen-xl mx-auto p-4">
        <SkeletonChatInterface />
      </div>
    </div>
  )
}

// Progressive loading wrapper
export function ProgressiveLoader({
  isLoading,
  skeleton,
  children,
  delay = 200
}: {
  isLoading: boolean
  skeleton: React.ReactNode
  children: React.ReactNode
  delay?: number
}) {
  const [showSkeleton, setShowSkeleton] = React.useState(false)

  React.useEffect(() => {
    let timeout: NodeJS.Timeout

    if (isLoading) {
      timeout = setTimeout(() => {
        setShowSkeleton(true)
      }, delay)
    } else {
      setShowSkeleton(false)
    }

    return () => {
      if (timeout) {
        clearTimeout(timeout)
      }
    }
  }, [isLoading, delay])

  if (isLoading && showSkeleton) {
    return <>{skeleton}</>
  }

  if (isLoading) {
    return null // Show nothing during delay
  }

  return <>{children}</>
}

// Hook for progressive loading states
import React from 'react'

export function useProgressiveLoading(initialLoading = true) {
  const [isLoading, setIsLoading] = React.useState(initialLoading)
  const [error, setError] = React.useState<string | null>(null)

  const startLoading = () => {
    setIsLoading(true)
    setError(null)
  }

  const stopLoading = () => {
    setIsLoading(false)
  }

  const setLoadingError = (error: string) => {
    setIsLoading(false)
    setError(error)
  }

  return {
    isLoading,
    error,
    startLoading,
    stopLoading,
    setLoadingError
  }
} 