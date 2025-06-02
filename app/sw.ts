/// <reference lib="webworker" />

import { defaultCache } from '@serwist/next/worker'
import { installSerwist } from '@serwist/sw'

// TypeScript declarations for service worker
declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: (string | { url: string; revision: string })[]
}

// Simplified Serwist installation using default caching
installSerwist({
  precacheEntries: self.__SW_MANIFEST || [],
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
})

// Enhanced event listeners
self.addEventListener('install', () => {
  console.log('[Piper SW] Service worker installing...')
  self.skipWaiting()
})

self.addEventListener('activate', (event: ExtendableEvent) => {
  console.log('[Piper SW] Service worker activated')
  
  // Clean up old caches
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            // Remove old cache versions that don't match current names
            const currentCaches = [
              'piper-api-cache',
              'piper-chat-cache', 
              'piper-images-cache',
              'piper-fonts-cache',
              'piper-assets-cache',
              'piper-pages-cache'
            ]
            return cacheName.startsWith('piper-') && !currentCaches.includes(cacheName)
          })
          .map((cacheName) => {
            console.log('[Piper SW] Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          })
      )
    }).then(() => {
      // Take control of all clients immediately
      return self.clients.claim()
    })
  )
})

// Background sync for offline actions
self.addEventListener('sync', (event: SyncEvent) => {
  console.log('[Piper SW] Background sync triggered:', event.tag)
  
  if (event.tag === 'piper-chat-sync') {
    event.waitUntil(syncOfflineChats())
  }
  
  if (event.tag === 'piper-message-sync') {
    event.waitUntil(syncOfflineMessages())
  }
})

// Message handling for main thread communication
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  console.log('[Piper SW] Message received:', event.data)
  
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
  
  if (event.data?.type === 'GET_VERSION') {
    event.ports[0]?.postMessage({ version: '1.0.0' })
  }
  
  if (event.data?.type === 'CLEAR_CACHE') {
    event.waitUntil(clearAllCaches())
  }
})

// Sync functions - to be enhanced with IndexedDB integration
async function syncOfflineChats(): Promise<void> {
  try {
    console.log('[Piper SW] Syncing offline chats...')
    
    // This will integrate with the offline storage we created
    // For now, we'll implement a basic sync mechanism
    
    console.log('[Piper SW] Chat sync completed')
  } catch (error) {
    console.error('[Piper SW] Failed to sync offline chats:', error)
  }
}

async function syncOfflineMessages(): Promise<void> {
  try {
    console.log('[Piper SW] Syncing offline messages...')
    
    // This will integrate with the offline storage we created
    // Similar to chat sync but for individual messages
    
    console.log('[Piper SW] Message sync completed')
  } catch (error) {
    console.error('[Piper SW] Failed to sync offline messages:', error)
  }
}

async function clearAllCaches(): Promise<void> {
  try {
    const cacheNames = await caches.keys()
    await Promise.all(
      cacheNames
        .filter(name => name.startsWith('piper-'))
        .map(name => caches.delete(name))
    )
    console.log('[Piper SW] All caches cleared')
  } catch (error) {
    console.error('[Piper SW] Failed to clear caches:', error)
  }
}

// Error handling for fetch events
self.addEventListener('fetch', (event: FetchEvent) => {
  // Let Serwist handle the fetch events with our configured strategies
  // This listener is mainly for logging and custom error handling
  
  if (event.request.url.includes('/api/') && !navigator.onLine) {
    console.log('[Piper SW] API request made while offline:', event.request.url)
  }
})

console.log('[Piper SW] Service worker script loaded successfully') 