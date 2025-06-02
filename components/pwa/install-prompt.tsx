'use client'

import { useState, useEffect } from 'react'
import { Download, X, Smartphone, Monitor, CheckCircle, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

interface InstallPromptProps {
  className?: string
  autoShow?: boolean
  onInstallSuccess?: () => void
  onDismiss?: () => void
}

export function InstallPrompt({ 
  className = '', 
  autoShow = true,
  onInstallSuccess,
  onDismiss 
}: InstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [installPlatform, setInstallPlatform] = useState<string>('')
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    // Mark as hydrated to prevent hydration mismatch
    setIsHydrated(true)
    
    // All browser API checks must happen after hydration
    if (typeof window === 'undefined') return
    
    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    const isIOSWebKit = 'standalone' in window.navigator && Boolean((window.navigator as { standalone?: boolean }).standalone)
    
    if (isStandalone || isIOSWebKit) {
      setIsInstalled(true)
      return
    }

    // Check localStorage for dismiss preference - only after hydration
    let isDismissed = false
    let daysSinceDismissed = 0
    
    try {
      const dismissedValue = localStorage.getItem('pwa-install-dismissed')
      const dismissedTime = localStorage.getItem('pwa-install-dismissed-time')
      
      if (dismissedValue && dismissedTime) {
        daysSinceDismissed = (Date.now() - parseInt(dismissedTime)) / (1000 * 60 * 60 * 24)
        isDismissed = daysSinceDismissed < 7
      }
    } catch (error) {
      // Handle localStorage errors gracefully
      console.warn('localStorage not available:', error)
    }
    
    if (isDismissed) {
      return // Don't show again for 7 days
    }

    const handler = (e: Event) => {
      e.preventDefault()
      const installEvent = e as BeforeInstallPromptEvent
      setDeferredPrompt(installEvent)
      setInstallPlatform(installEvent.platforms?.[0] || 'unknown')
      
      if (autoShow) {
        // Show prompt after a short delay for better UX
        setTimeout(() => {
          setShowPrompt(true)
        }, 2000)
      }
    }

    const appInstalledHandler = () => {
      setIsInstalled(true)
      setShowPrompt(false)
      setDeferredPrompt(null)
      onInstallSuccess?.()
    }

    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', appInstalledHandler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', appInstalledHandler)
    }
  }, [autoShow, onInstallSuccess])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    setIsInstalling(true)

    try {
      await deferredPrompt.prompt()
      const choiceResult = await deferredPrompt.userChoice

      if (choiceResult.outcome === 'accepted') {
        console.log('[PWA Install] User accepted the install prompt')
        setIsInstalled(true)
        setShowPrompt(false)
        onInstallSuccess?.()
      } else {
        console.log('[PWA Install] User dismissed the install prompt')
        handleDismiss('user_declined')
      }
    } catch (error) {
      console.error('[PWA Install] Error during installation:', error)
    } finally {
      setIsInstalling(false)
      setDeferredPrompt(null)
    }
  }

  const handleDismiss = (reason: string = 'manual') => {
    setShowPrompt(false)
    
    // Safely handle localStorage
    try {
      localStorage.setItem('pwa-install-dismissed', 'true')
      localStorage.setItem('pwa-install-dismissed-time', Date.now().toString())
      localStorage.setItem('pwa-install-dismiss-reason', reason)
    } catch (error) {
      console.warn('Could not save dismiss preference:', error)
    }
    
    onDismiss?.()
  }

  const handleShowManually = () => {
    if (deferredPrompt) {
      setShowPrompt(true)
    }
  }

  // Don't render anything until hydrated to prevent hydration mismatch
  if (!isHydrated) {
    return null
  }

  // Don't render anything if already installed
  if (isInstalled) {
    return null
  }

  // Render trigger button if prompt is available but not shown
  if (deferredPrompt && !showPrompt) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleShowManually}
        className={`fixed bottom-4 right-4 z-40 ${className}`}
      >
        <Download className="h-4 w-4 mr-2" />
        Install App
      </Button>
    )
  }

  // Don't render if no prompt event or not showing
  if (!deferredPrompt || !showPrompt) {
    return null
  }

  const getPlatformIcon = () => {
    if (typeof window === 'undefined') return <Monitor className="h-5 w-5 text-blue-600 dark:text-blue-400" />
    
    if (installPlatform.includes('mobile') || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
      return <Smartphone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
    }
    return <Monitor className="h-5 w-5 text-blue-600 dark:text-blue-400" />
  }

  const getPlatformText = () => {
    if (typeof window === 'undefined') return 'desktop'
    
    if (installPlatform.includes('mobile') || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
      return 'mobile device'
    }
    return 'desktop'
  }

  return (
    <div className={`fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50 ${className}`}>
      <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-xl">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center w-10 h-10 bg-blue-100 dark:bg-blue-900/40 rounded-full">
                {getPlatformIcon()}
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Install Piper
                </h3>
                <Badge variant="secondary" className="text-xs">
                  PWA
                </Badge>
              </div>
              
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                Get the full app experience with offline access, faster loading, and native-like performance on your {getPlatformText()}.
              </p>
              
              <div className="space-y-2">
                <div className="text-xs">
                  <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">App features:</p>
                  <ul className="text-gray-600 dark:text-gray-400 space-y-0.5">
                    <li className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      <span>Works offline</span>
                    </li>
                    <li className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      <span>Faster loading</span>
                    </li>
                    <li className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      <span>Native app experience</span>
                    </li>
                    <li className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      <span>Background sync</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDismiss('close_button')}
              className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
            <Button
              onClick={handleInstall}
              disabled={isInstalling}
              className="flex-1 flex items-center justify-center gap-2"
              size="sm"
            >
              <Download className={`h-4 w-4 ${isInstalling ? 'animate-pulse' : ''}`} />
              {isInstalling ? 'Installing...' : 'Install Now'}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDismiss('not_now')}
              className="text-gray-600 dark:text-gray-400"
            >
              Not now
            </Button>
          </div>
          
          <div className="flex items-center gap-1 mt-2 text-xs text-gray-500 dark:text-gray-500">
            <ExternalLink className="h-3 w-3" />
            <span>Installs to your device home screen</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Hook for checking PWA install availability
export function usePWAInstall() {
  const [canInstall, setCanInstall] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    // Mark as hydrated to prevent hydration mismatch
    setIsHydrated(true)
    
    // All browser API checks must happen after hydration
    if (typeof window === 'undefined') return
    
    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    const isIOSWebKit = 'standalone' in window.navigator && Boolean((window.navigator as { standalone?: boolean }).standalone)
    
    setIsInstalled(isStandalone || isIOSWebKit)

    const handler = (e: Event) => {
      e.preventDefault()
      const installEvent = e as BeforeInstallPromptEvent
      setInstallPrompt(installEvent)
      setCanInstall(true)
    }

    const appInstalledHandler = () => {
      setIsInstalled(true)
      setCanInstall(false)
      setInstallPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', appInstalledHandler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', appInstalledHandler)
    }
  }, [])

  const install = async () => {
    if (!installPrompt) return false

    try {
      await installPrompt.prompt()
      const choiceResult = await installPrompt.userChoice
      return choiceResult.outcome === 'accepted'
    } catch (error) {
      console.error('PWA install failed:', error)
      return false
    }
  }

  return {
    canInstall: isHydrated ? canInstall : false,
    isInstalled: isHydrated ? isInstalled : false,
    install
  }
}

// Simple install button component
export function InstallButton({ 
  className = '',
  variant = 'default' as const,
  children = 'Install App'
}) {
  const { canInstall, install } = usePWAInstall()

  if (!canInstall) return null

  return (
    <Button
      variant={variant}
      onClick={install}
      className={className}
    >
      <Download className="h-4 w-4 mr-2" />
      {children}
    </Button>
  )
} 