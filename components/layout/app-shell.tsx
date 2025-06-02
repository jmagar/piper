'use client'

import { Suspense } from 'react'
import { SkeletonChatInterface } from '@/components/ui/skeleton-screens'
import { OfflineIndicator } from '@/components/offline/offline-indicator'
import { InstallPrompt } from '@/components/pwa/install-prompt'
import { ErrorBoundary } from '@/app/components/error-boundary'

interface AppShellProps {
  children: React.ReactNode
  showOfflineIndicator?: boolean
  showInstallPrompt?: boolean
}

export function AppShell({ 
  children, 
  showOfflineIndicator = true,
  showInstallPrompt = true 
}: AppShellProps) {
  return (
    <div className="app-shell min-h-screen bg-background">
      {/* Critical app structure - loads instantly */}
      <div id="app-shell-header" className="app-shell-header">
        {/* Header will be populated by the actual layout */}
      </div>
      
      <main id="app-shell-main" className="app-shell-main">
        <Suspense fallback={<SkeletonChatInterface />}>
          {children}
        </Suspense>
      </main>
      
      {/* PWA-specific UI overlays */}
      {showOfflineIndicator && (
        <ErrorBoundary 
          fallback={<div className="fixed top-4 right-4 z-50 text-xs text-muted-foreground">PWA features temporarily unavailable</div>}
        >
          <OfflineIndicator />
        </ErrorBoundary>
      )}
      {showInstallPrompt && (
        <ErrorBoundary fallback={null}>
          <InstallPrompt />
        </ErrorBoundary>
      )}
      
      {/* App shell footer if needed */}
      <div id="app-shell-footer" className="app-shell-footer">
        {/* Footer content */}
      </div>
    </div>
  )
}

// Fast-loading app shell CSS (should be inlined in production)
export const AppShellStyles = `
  .app-shell {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    background-color: var(--background);
  }
  
  .app-shell-header {
    flex: none;
    /* Header styles that can be applied immediately */
  }
  
  .app-shell-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    position: relative;
  }
  
  .app-shell-footer {
    flex: none;
  }
  
  /* Instant loading optimizations */
  .app-shell * {
    box-sizing: border-box;
  }
  
  /* Critical rendering path optimizations */
  .app-shell img {
    loading: eager;
    decoding: sync;
  }
  
  /* Prevent layout shifts */
  .app-shell [data-loading] {
    contain: layout;
  }
`

// App shell component with hydration optimization
export function OptimizedAppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Inline critical styles for instant rendering */}
      <style dangerouslySetInnerHTML={{ __html: AppShellStyles }} />
      
      <AppShell>
        {children}
      </AppShell>
    </>
  )
}

// Hook for app shell state management
import { useState, useEffect } from 'react'

export function useAppShell() {
  const [isShellReady, setIsShellReady] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    // Mark both as ready when DOM is loaded and hydrated
    setIsShellReady(true)
    setIsHydrated(true)
  }, [])

  return {
    isShellReady,
    isHydrated
  }
}

// PWA App Shell Service Worker helper
export const registerAppShell = () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      // Send message to SW to cache app shell resources
      if (registration.active) {
        registration.active.postMessage({
          type: 'CACHE_APP_SHELL',
          resources: [
            '/',
            '/manifest.json',
            '/icons/icon-192x192.png',
            '/icons/icon-512x512.png',
            // Add other critical resources
          ]
        })
      }
    })
  }
} 