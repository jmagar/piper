import { useState, useEffect, useCallback } from 'react'
import { useOnlineStatus } from '@/components/offline/offline-indicator'
import { 
  offlineStorage, 
  createOfflineMessage, 
  createOfflineChat,
  type OfflineMessage,
  type OfflineChat,
  type PendingAction
} from '@/lib/offline-storage'
import type { Chat, Message } from '@/lib/chat-store/types'

interface UseOfflineChatProps {
  chatId?: string
  onMessageSent?: (message: Message) => void
  onChatCreated?: (chat: Chat) => void
  onSyncComplete?: () => void
}

interface UseOfflineChatReturn {
  // Offline state
  isOnline: boolean
  isSyncing: boolean
  pendingMessages: number
  
  // Chat operations
  sendMessage: (content: string, role: 'user' | 'assistant') => Promise<string>
  createChat: (title: string, initialMessage?: string) => Promise<string>
  getOfflineChats: () => Promise<OfflineChat[]>
  getChatMessages: (chatId: string) => Promise<OfflineMessage[]>
  
  // Sync operations
  syncPendingActions: () => Promise<void>
  forceSyncAll: () => Promise<void>
  
  // Storage stats
  getStorageStats: () => Promise<{
    chats: number
    messages: number
    pendingActions: number
  }>
}

export function useOfflineChat({
  chatId,
  onMessageSent,
  onChatCreated,
  onSyncComplete
}: UseOfflineChatProps = {}): UseOfflineChatReturn {
  const isOnline = useOnlineStatus()
  const [isSyncing, setIsSyncing] = useState(false)
  const [pendingMessages, setPendingMessages] = useState(0)

  // Update pending messages count
  const updatePendingCount = useCallback(async () => {
    try {
      const pendingActions = await offlineStorage.getPendingActions()
      const messageActions = pendingActions.filter(action => 
        action.type === 'send_message'
      )
      setPendingMessages(messageActions.length)
    } catch (error) {
      console.error('[Offline Chat] Failed to get pending count:', error)
    }
  }, [])

  // Sync individual action
  const syncAction = useCallback(async (action: PendingAction): Promise<void> => {
    switch (action.type) {
      case 'send_message':
        await syncMessage(action)
        break
      case 'create_chat':
        await syncChatCreation(action)
        break
      default:
        console.warn('[Offline Chat] Unknown action type:', action.type)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync message to server
  const syncMessage = useCallback(async (action: PendingAction): Promise<void> => {
    const response = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action.data)
    })

    if (!response.ok) {
      throw new Error(`Failed to sync message: ${response.status}`)
    }

    const serverMessage = await response.json()
    
    // Update local storage with server ID
    const { tempId, chatId } = action.data as { tempId?: string; chatId?: string }
    if (tempId && chatId) {
      const localMessage = await offlineStorage.getMessagesForChat(chatId)
      const messageToUpdate = localMessage.find(m => m.id === tempId)
      
      if (messageToUpdate) {
        messageToUpdate.id = serverMessage.id
        messageToUpdate.synced = true
        await offlineStorage.saveMessage(messageToUpdate)
      }
    }
  }, [])

  // Sync chat creation to server
  const syncChatCreation = useCallback(async (action: PendingAction): Promise<void> => {
    const response = await fetch('/api/chats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action.data)
    })

    if (!response.ok) {
      throw new Error(`Failed to sync chat: ${response.status}`)
    }

    const serverChat = await response.json()
    
    // Update local storage with server ID
    const { tempId } = action.data as { tempId?: string }
    if (tempId) {
      const localChat = await offlineStorage.getChat(tempId)
      if (localChat) {
        localChat.id = serverChat.id
        localChat.synced = true
        await offlineStorage.saveChat(localChat)
      }
    }
  }, [])

  // Sync pending actions
  const syncPendingActions = useCallback(async (): Promise<void> => {
    if (!isOnline || isSyncing) return

    setIsSyncing(true)
    console.log('[Offline Chat] Starting sync of pending actions')

    try {
      const pendingActions = await offlineStorage.getPendingActions()
      
      for (const action of pendingActions) {
        try {
          await syncAction(action)
          await offlineStorage.removePendingAction(action.id)
        } catch (error) {
          console.error('[Offline Chat] Failed to sync action:', action.id, error)
          await offlineStorage.incrementRetryCount(action.id)
          
          // Skip actions with too many retry attempts
          if (action.retryCount >= 3) {
            console.warn('[Offline Chat] Removing action after max retries:', action.id)
            await offlineStorage.removePendingAction(action.id)
          }
        }
      }
      
      await updatePendingCount()
      onSyncComplete?.()
      console.log('[Offline Chat] Sync completed successfully')
      
    } catch (error) {
      console.error('[Offline Chat] Sync failed:', error)
    } finally {
      setIsSyncing(false)
    }
  }, [isOnline, isSyncing, updatePendingCount, onSyncComplete, syncAction])

  // Send message (works offline)
  const sendMessage = useCallback(async (
    content: string, 
    role: 'user' | 'assistant' = 'user'
  ): Promise<string> => {
    const targetChatId = chatId
    if (!targetChatId) {
      throw new Error('No chat ID provided for message')
    }

    try {
      // Create offline message
      const offlineMessage = createOfflineMessage(targetChatId, content, role)
      
      if (isOnline) {
        // Try to send immediately when online
        try {
          const response = await fetch('/api/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chatId: targetChatId,
              content,
              role
            })
          })

          if (response.ok) {
            const serverMessage = await response.json()
            
            // Mark as synced and store
            offlineMessage.id = serverMessage.id
            offlineMessage.synced = true
            await offlineStorage.saveMessage(offlineMessage)
            
            // Convert to expected format and notify
            const message: Message = {
              id: serverMessage.id,
              chatId: targetChatId,
              content,
              role,
              createdAt: new Date()
            }
            onMessageSent?.(message)
            
            return serverMessage.id
          } else {
            throw new Error(`Failed to send message: ${response.status}`)
          }
        } catch (error) {
          console.warn('[Offline Chat] Failed to send online, storing offline:', error)
          // Fall through to offline storage
        }
      }

      // Store offline (either because offline or online failed)
      await offlineStorage.saveMessage(offlineMessage)
      
      // Add to pending actions for later sync
      await offlineStorage.addPendingAction({
        type: 'send_message',
        data: {
          chatId: targetChatId,
          content,
          role,
          tempId: offlineMessage.id
        }
      })
      
      await updatePendingCount()
      
      console.log('[Offline Chat] Message stored offline:', offlineMessage.id)
      return offlineMessage.id
      
    } catch (error) {
      console.error('[Offline Chat] Failed to send message:', error)
      throw error
    }
  }, [chatId, isOnline, onMessageSent, updatePendingCount])

  // Create chat (works offline)
  const createChat = useCallback(async (
    title: string, 
    initialMessage?: string
  ): Promise<string> => {
    try {
      const offlineChat = createOfflineChat(title)
      
      // Add initial message if provided
      if (initialMessage) {
        const firstMessage = createOfflineMessage(
          offlineChat.id, 
          initialMessage, 
          'user'
        )
        offlineChat.messages = [firstMessage]
        await offlineStorage.saveMessage(firstMessage)
      }

      if (isOnline) {
        // Try to create immediately when online
        try {
          const response = await fetch('/api/chats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title,
              initialMessage
            })
          })

          if (response.ok) {
            const serverChat = await response.json()
            
            // Update with server ID and mark as synced
            offlineChat.id = serverChat.id
            offlineChat.synced = true
            await offlineStorage.saveChat(offlineChat)
            
            // Convert to expected format and notify
            const chat: Chat = {
              id: serverChat.id,
              title,
              createdAt: new Date(),
              updatedAt: new Date()
            }
            onChatCreated?.(chat)
            
            return serverChat.id
          } else {
            throw new Error(`Failed to create chat: ${response.status}`)
          }
        } catch (error) {
          console.warn('[Offline Chat] Failed to create online, storing offline:', error)
          // Fall through to offline storage
        }
      }

      // Store offline
      await offlineStorage.saveChat(offlineChat)
      
      // Add to pending actions
      await offlineStorage.addPendingAction({
        type: 'create_chat',
        data: {
          title,
          initialMessage,
          tempId: offlineChat.id
        }
      })
      
      await updatePendingCount()
      
      console.log('[Offline Chat] Chat created offline:', offlineChat.id)
      return offlineChat.id
      
    } catch (error) {
      console.error('[Offline Chat] Failed to create chat:', error)
      throw error
    }
  }, [isOnline, onChatCreated, updatePendingCount])

  // Get offline chats
  const getOfflineChats = useCallback(async (): Promise<OfflineChat[]> => {
    try {
      return await offlineStorage.getAllChats()
    } catch (error) {
      console.error('[Offline Chat] Failed to get offline chats:', error)
      return []
    }
  }, [])

  // Get chat messages
  const getChatMessages = useCallback(async (targetChatId: string): Promise<OfflineMessage[]> => {
    try {
      return await offlineStorage.getMessagesForChat(targetChatId)
    } catch (error) {
      console.error('[Offline Chat] Failed to get chat messages:', error)
      return []
    }
  }, [])

  // Force sync all data
  const forceSyncAll = useCallback(async (): Promise<void> => {
    if (!isOnline) {
      throw new Error('Cannot sync while offline')
    }

    setIsSyncing(true)
    console.log('[Offline Chat] Starting force sync of all data')

    try {
      // Sync pending actions first
      await syncPendingActions()
      
      // Sync any unsynced chats
      const unsyncedChats = await offlineStorage.getUnsyncedChats()
      for (const chat of unsyncedChats) {
        // Implementation would depend on your sync API
        console.log('[Offline Chat] Found unsynced chat:', chat.id)
      }
      
      // Sync any unsynced messages
      const unsyncedMessages = await offlineStorage.getUnsyncedMessages()
      for (const message of unsyncedMessages) {
        console.log('[Offline Chat] Found unsynced message:', message.id)
      }
      
      console.log('[Offline Chat] Force sync completed')
      
    } catch (error) {
      console.error('[Offline Chat] Force sync failed:', error)
      throw error
    } finally {
      setIsSyncing(false)
    }
  }, [isOnline, syncPendingActions])

  // Get storage statistics
  const getStorageStats = useCallback(async () => {
    try {
      return await offlineStorage.getStorageStats()
    } catch (error) {
      console.error('[Offline Chat] Failed to get storage stats:', error)
      return { chats: 0, messages: 0, pendingActions: 0 }
    }
  }, [])

  // Initialize offline storage
  useEffect(() => {
    const initStorage = async () => {
      try {
        await offlineStorage.init()
        updatePendingCount()
      } catch (error) {
        console.error('[Offline Chat] Failed to initialize storage:', error)
      }
    }

    initStorage()
  }, [updatePendingCount])

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && pendingMessages > 0) {
      console.log('[Offline Chat] Back online, starting auto-sync')
      syncPendingActions()
    }
  }, [isOnline, pendingMessages, syncPendingActions])

  return {
    // Offline state
    isOnline,
    isSyncing,
    pendingMessages,
    
    // Chat operations
    sendMessage,
    createChat,
    getOfflineChats,
    getChatMessages,
    
    // Sync operations
    syncPendingActions,
    forceSyncAll,
    
    // Storage stats
    getStorageStats
  }
} 