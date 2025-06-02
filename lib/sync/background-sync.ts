export class BackgroundSyncManager {
  private sw: ServiceWorker | null = null
  private registration: ServiceWorkerRegistration | null = null

  async init(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      console.warn('[Background Sync] Service Worker not supported')
      return
    }

    if (!('sync' in window.ServiceWorkerRegistration.prototype)) {
      console.warn('[Background Sync] Background Sync not supported')
      return
    }

    try {
      // Get service worker registration
      this.registration = await navigator.serviceWorker.ready
      
      if (this.registration.active) {
        this.sw = this.registration.active
        console.log('[Background Sync] Service Worker ready for background sync')
      }

      // Listen for service worker messages
      navigator.serviceWorker.addEventListener('message', this.handleMessage)
      
      // Listen for online/offline events
      window.addEventListener('online', this.handleOnline)
      window.addEventListener('offline', this.handleOffline)

    } catch (error) {
      console.error('[Background Sync] Failed to initialize:', error)
    }
  }

  private handleMessage = (event: MessageEvent) => {
    console.log('[Background Sync] Message from SW:', event.data)
    
    if (event.data?.type === 'SYNC_COMPLETE') {
      this.notifySyncComplete(event.data.tag, event.data.success)
    }
  }

  private handleOnline = () => {
    console.log('[Background Sync] Back online, triggering sync')
    this.syncPendingActions()
  }

  private handleOffline = () => {
    console.log('[Background Sync] Gone offline')
  }

  // Register a background sync
  async registerSync(tag: string): Promise<boolean> {
    if (!this.registration?.sync) {
      console.warn('[Background Sync] Background sync not available')
      return false
    }

    try {
      await this.registration.sync.register(tag)
      console.log('[Background Sync] Registered sync:', tag)
      return true
    } catch (error) {
      console.error('[Background Sync] Failed to register sync:', error)
      return false
    }
  }

  // Sync pending chat actions
  async syncPendingActions(): Promise<void> {
    const synced = await this.registerSync('piper-chat-sync')
    if (!synced) {
      // Fallback to manual sync if background sync not available
      console.log('[Background Sync] Falling back to manual sync')
      this.manualSync()
    }
  }

  // Sync pending messages
  async syncPendingMessages(): Promise<void> {
    await this.registerSync('piper-message-sync')
  }

  // Manual sync fallback
  private async manualSync(): Promise<void> {
    if (!this.sw) return

    try {
      // Notify service worker to perform sync
      this.sw.postMessage({
        type: 'MANUAL_SYNC',
        timestamp: Date.now()
      })
    } catch (error) {
      console.error('[Background Sync] Manual sync failed:', error)
    }
  }

  // Send message to service worker
  async sendMessage(message: Record<string, unknown>): Promise<void> {
    if (!this.sw) {
      console.warn('[Background Sync] Service worker not available')
      return
    }

    try {
      this.sw.postMessage(message)
    } catch (error) {
      console.error('[Background Sync] Failed to send message to SW:', error)
    }
  }

  // Get sync status from service worker
  async getSyncStatus(): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      if (!this.sw) {
        reject(new Error('Service worker not available'))
        return
      }

      const channel = new MessageChannel()
      
      channel.port1.onmessage = (event) => {
        resolve(event.data)
      }

      try {
        this.sw.postMessage({
          type: 'GET_SYNC_STATUS'
        }, [channel.port2])
      } catch (error) {
        reject(error)
      }

      // Timeout after 5 seconds
      setTimeout(() => {
        reject(new Error('Sync status request timed out'))
      }, 5000)
    })
  }

  // Clear all pending syncs
  async clearPendingSyncs(): Promise<void> {
    await this.sendMessage({
      type: 'CLEAR_PENDING_SYNCS'
    })
  }

  // Notify sync completion (can be overridden)
  private notifySyncComplete(tag: string, success: boolean): void {
    console.log(`[Background Sync] Sync ${tag} ${success ? 'succeeded' : 'failed'}`)
    
    // Dispatch custom event for other parts of the app to listen to
    window.dispatchEvent(new CustomEvent('sync-complete', {
      detail: { tag, success }
    }))
  }

  // Cleanup
  destroy(): void {
    navigator.serviceWorker.removeEventListener('message', this.handleMessage)
    window.removeEventListener('online', this.handleOnline)
    window.removeEventListener('offline', this.handleOffline)
  }
}

// Singleton instance
export const backgroundSync = new BackgroundSyncManager()

// Hook for React components
import { useState, useEffect } from 'react'

export function useBackgroundSync() {
  const [isSupported, setIsSupported] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)

  useEffect(() => {
    const init = async () => {
      const supported = 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype
      setIsSupported(supported)

      if (supported) {
        await backgroundSync.init()
        setIsInitialized(true)
      }
    }

    init()

    // Listen for sync completion events
    const handleSyncComplete = () => {
      setLastSync(new Date())
    }

    window.addEventListener('sync-complete', handleSyncComplete as EventListener)

    return () => {
      window.removeEventListener('sync-complete', handleSyncComplete as EventListener)
    }
  }, [])

  const triggerSync = async (tag: string = 'piper-chat-sync') => {
    if (isInitialized) {
      return await backgroundSync.registerSync(tag)
    }
    return false
  }

  return {
    isSupported,
    isInitialized,
    lastSync,
    triggerSync,
    syncPendingActions: backgroundSync.syncPendingActions.bind(backgroundSync),
    syncPendingMessages: backgroundSync.syncPendingMessages.bind(backgroundSync),
  }
}

// Enhanced offline chat hook with background sync
export function useOfflineChatWithSync(chatId?: string) {
  const { isSupported, triggerSync } = useBackgroundSync()
  const [pendingActions, setPendingActions] = useState(0)

  // Auto-sync when going online
  useEffect(() => {
    const handleOnline = () => {
      if (isSupported && pendingActions > 0) {
        triggerSync('piper-chat-sync')
      }
    }

    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [isSupported, pendingActions, triggerSync])

  // Queue action for background sync
  const queueForSync = async (action: {
    type: string
    data: Record<string, unknown>
  }) => {
    // Store in IndexedDB (implementation depends on your offline storage)
    console.log('[Offline Chat] Queuing action for sync:', action)
    
    setPendingActions(prev => prev + 1)

    // Register for background sync
    if (isSupported) {
      await triggerSync('piper-chat-sync')
    }
  }

  // Send message with auto-queue
  const sendMessage = async (content: string, role: 'user' | 'assistant' = 'user') => {
    const messageAction = {
      type: 'send_message',
      data: {
        chatId,
        content,
        role,
        timestamp: Date.now()
      }
    }

    if (navigator.onLine) {
      // Try to send immediately
      try {
        const response = await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(messageAction.data)
        })

        if (response.ok) {
          return await response.json()
        } else {
          throw new Error('Failed to send message')
        }
              } catch {
          console.warn('[Offline Chat] Failed to send online, queuing for sync')
          await queueForSync(messageAction)
        }
    } else {
      // Queue for later sync
      await queueForSync(messageAction)
    }
  }

  return {
    sendMessage,
    queueForSync,
    pendingActions,
    isBackgroundSyncSupported: isSupported
  }
} 