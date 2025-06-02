'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, Wifi, WifiOff, X, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { motion, AnimatePresence } from 'framer-motion'

interface OfflineIndicatorProps {
  className?: string
  showDetails?: boolean
}

export function OfflineIndicator({ className = '', showDetails = true }: OfflineIndicatorProps) {
  const [isOnline, setIsOnline] = useState(true)
  const [isReconnecting, setIsReconnecting] = useState(false)
  const [showFullNotification, setShowFullNotification] = useState(true)
  const [lastOfflineTime, setLastOfflineTime] = useState<Date | null>(null)

  useEffect(() => {
    // Initialize online status
    setIsOnline(navigator.onLine)

    const handleOnline = () => {
      console.log('[Offline Indicator] Back online')
      setIsOnline(true)
      setIsReconnecting(false)
      setLastOfflineTime(null)
      
      // Show reconnection notification briefly
      setShowFullNotification(true)
      setTimeout(() => setShowFullNotification(false), 3000)
    }

    const handleOffline = () => {
      console.log('[Offline Indicator] Gone offline')
      setIsOnline(false)
      setIsReconnecting(false)
      setLastOfflineTime(new Date())
      setShowFullNotification(true)
    }

    // Add event listeners
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleRetryConnection = async () => {
    setIsReconnecting(true)
    
    try {
      // Try to fetch a small resource to test connectivity
      const response = await fetch('/api/health', { 
        method: 'HEAD',
        cache: 'no-cache' 
      })
      
      if (response.ok) {
        setIsOnline(true)
        setIsReconnecting(false)
        setShowFullNotification(false)
      } else {
        setIsReconnecting(false)
      }
         } catch {
       console.log('[Offline Indicator] Still offline')
       setIsReconnecting(false)
     }
  }

  const handleDismiss = () => {
    setShowFullNotification(false)
  }

  // Show online status briefly when reconnected
  if (isOnline && showFullNotification) {
    return (
      <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 ${className}`}>
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ 
              type: "spring", 
              duration: 0.4, 
              bounce: 0.1 
            }}
          >
            <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 shadow-lg">
              <CardContent className="flex items-center gap-3 p-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
                >
                  <Wifi className="h-5 w-5 text-green-600 dark:text-green-400" />
                </motion.div>
                <div className="flex-1">
                  <motion.p 
                    className="text-sm font-medium text-green-800 dark:text-green-200"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    Back online
                  </motion.p>
                  <motion.p 
                    className="text-xs text-green-600 dark:text-green-400"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    All features are now available
                  </motion.p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDismiss}
                  className="h-8 w-8 p-0 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200"
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>
    )
  }

  // Don't show anything if online and notification is dismissed
  if (isOnline) return null

  // Minimal offline indicator
  if (!showDetails || !showFullNotification) {
    return (
      <div className={`fixed top-4 right-4 z-50 ${className}`}>
        <Badge 
          variant="destructive" 
          className="cursor-pointer"
          onClick={() => setShowFullNotification(true)}
        >
          <WifiOff className="h-3 w-3 mr-1" />
          Offline
        </Badge>
      </div>
    )
  }

  // Full offline notification
  return (
    <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 ${className}`}>
      <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 shadow-lg max-w-md">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center w-10 h-10 bg-yellow-100 dark:bg-yellow-900/40 rounded-full">
                <WifiOff className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                                 <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
                   You&apos;re offline
                 </h3>
                <Badge variant="outline" className="text-xs">
                  {lastOfflineTime && `Since ${lastOfflineTime.toLocaleTimeString()}`}
                </Badge>
              </div>
              
              <p className="text-xs text-yellow-700 dark:text-yellow-300 mb-3">
                Some features are limited while offline. You can still view previous conversations and compose messages.
              </p>
              
              <div className="space-y-2">
                <div className="text-xs">
                  <p className="font-medium text-yellow-800 dark:text-yellow-200 mb-1">Available offline:</p>
                  <ul className="text-yellow-700 dark:text-yellow-300 space-y-0.5 ml-3">
                    <li>• View conversation history</li>
                    <li>• Read previous messages</li>
                    <li>• Compose messages (will sync when online)</li>
                    <li>• Access app settings</li>
                  </ul>
                </div>
                
                <div className="text-xs">
                  <p className="font-medium text-yellow-800 dark:text-yellow-200 mb-1">Requires connection:</p>
                  <ul className="text-yellow-700 dark:text-yellow-300 space-y-0.5 ml-3">
                    <li>• Send new messages</li>
                    <li>• Create new conversations</li>
                    <li>• AI responses</li>
                    <li>• Sync across devices</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-8 w-8 p-0 text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-200 flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-yellow-200 dark:border-yellow-800">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetryConnection}
              disabled={isReconnecting}
              className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700"
            >
              <RefreshCw className={`h-3 w-3 ${isReconnecting ? 'animate-spin' : ''}`} />
              {isReconnecting ? 'Checking...' : 'Retry connection'}
            </Button>
            
            <div className="flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400">
              <AlertTriangle className="h-3 w-3" />
              <span>Auto-retry in background</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Hook for checking online status in other components
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    setIsOnline(navigator.onLine)

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}

// Context for offline state management
import { createContext, useContext } from 'react'

interface OfflineContextType {
  isOnline: boolean
  isReconnecting: boolean
  lastOfflineTime: Date | null
  retryConnection: () => Promise<void>
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined)

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true)
  const [isReconnecting, setIsReconnecting] = useState(false)
  const [lastOfflineTime, setLastOfflineTime] = useState<Date | null>(null)

  useEffect(() => {
    setIsOnline(navigator.onLine)

    const handleOnline = () => {
      setIsOnline(true)
      setIsReconnecting(false)
      setLastOfflineTime(null)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setLastOfflineTime(new Date())
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const retryConnection = async () => {
    setIsReconnecting(true)
    
    try {
      const response = await fetch('/api/health', { 
        method: 'HEAD',
        cache: 'no-cache' 
      })
      
      if (response.ok) {
        setIsOnline(true)
      }
         } catch {
       console.log('Connection retry failed')
     } finally {
      setIsReconnecting(false)
    }
  }

  return (
    <OfflineContext.Provider 
      value={{ 
        isOnline, 
        isReconnecting, 
        lastOfflineTime, 
        retryConnection 
      }}
    >
      {children}
    </OfflineContext.Provider>
  )
}

export function useOfflineContext() {
  const context = useContext(OfflineContext)
  if (context === undefined) {
    throw new Error('useOfflineContext must be used within an OfflineProvider')
  }
  return context
} 