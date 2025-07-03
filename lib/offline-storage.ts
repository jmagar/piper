import { openDB, DBSchema, IDBPDatabase } from 'idb'

// Database schema definition - simplified for compatibility
interface PiperDB extends DBSchema {
  chats: {
    key: string;
    value: OfflineChat;
    indexes: {
      'timestamp': number;
      'synced': number; // Index keys for booleans are numbers (0 or 1)
    };
  };
  messages: {
    key: string;
    value: OfflineMessage;
    indexes: {
      'chatId': string;
      'timestamp': number;
      'synced': number; // Index keys for booleans are numbers (0 or 1)
    };
  };
  pendingActions: {
    key: string;
    value: PendingAction;
    indexes: {
      'type': string;
      'timestamp': number;
    };
  };
  settings: {
    key: string;
    value: { key: string; actualValue: Record<string, unknown> };
    // No indexes for settings
  };
}

// Type definitions
export interface OfflineMessage {
  id: string
  chatId: string
  content: string
  role: 'user' | 'assistant'
  timestamp: number
  synced: boolean
}

export interface PendingAction {
  id: string
  type: 'send_message' | 'create_chat' | 'update_chat' | 'delete_chat'
  data: Record<string, unknown>
  timestamp: number
  retryCount: number
}

export interface OfflineChat {
  id: string
  title: string
  messages: OfflineMessage[]
  timestamp: number
  synced: boolean
  lastUpdated: number
}

class OfflineStorage {
  private db: IDBPDatabase<PiperDB> | null = null
  private readonly DB_NAME = 'piper-offline-db'
  private readonly DB_VERSION = 1

  async init(): Promise<void> {
    if (this.db) return

    try {
      this.db = await openDB<PiperDB>(this.DB_NAME, this.DB_VERSION, {
        upgrade(db, oldVersion, newVersion) {
          console.log('Upgrading database from version', oldVersion, 'to', newVersion)

          // Create chats store
          if (!db.objectStoreNames.contains('chats')) {
            const chatsStore = db.createObjectStore('chats', { keyPath: 'id' })
            chatsStore.createIndex('timestamp', 'timestamp')
            chatsStore.createIndex('synced', 'synced')
          }

          // Create messages store
          if (!db.objectStoreNames.contains('messages')) {
            const messagesStore = db.createObjectStore('messages', { keyPath: 'id' })
            messagesStore.createIndex('chatId', 'chatId')
            messagesStore.createIndex('timestamp', 'timestamp')
            messagesStore.createIndex('synced', 'synced')
          }

          // Create pending actions store
          if (!db.objectStoreNames.contains('pendingActions')) {
            const pendingStore = db.createObjectStore('pendingActions', { keyPath: 'id' })
            pendingStore.createIndex('type', 'type')
            pendingStore.createIndex('timestamp', 'timestamp')
          }

          // Create settings store
          if (!db.objectStoreNames.contains('settings')) {
            db.createObjectStore('settings', { keyPath: 'key' })
          }
        },
        blocked: () => {
          // This event is fired when the database upgrade is blocked by another tab.
          console.warn(
            'Database upgrade blocked - another version may be open in another tab'
          )
        },
        blocking: () => {
          // This event is fired when the database connection is blocking another connection.
          console.warn('Database blocking another upgrade - closing connection')
          this.close() // Ensure we close the current connection
        },
        terminated: () => {
          // This event is fired when the browser terminates the database connection.
          console.warn('Database connection terminated unexpectedly')
          this.db = null
        }
      })

      console.log('Offline storage initialized successfully')
    } catch (error) {
      console.error('Failed to initialize offline storage:', error)
      throw error
    }
  }

  // Chat operations
  async saveChat(chat: OfflineChat): Promise<void> {
    await this.ensureDB()
    try {
      await this.db!.put('chats', {
        ...chat,
        lastUpdated: Date.now(),
      })
      console.log('Chat saved offline:', chat.id)
    } catch (error) {
      console.error('Failed to save chat offline:', error)
      throw error
    }
  }

  async getChat(chatId: string): Promise<OfflineChat | undefined> {
    await this.ensureDB()
    try {
      return await this.db!.get('chats', chatId)
    } catch (error) {
      console.error('Failed to get chat:', error)
      return undefined
    }
  }

  async getAllChats(): Promise<OfflineChat[]> {
    await this.ensureDB()
    try {
      return await this.db!.getAll('chats')
    } catch (error) {
      console.error('Failed to get all chats:', error)
      return []
    }
  }

  async getUnsyncedChats(): Promise<OfflineChat[]> {
    await this.ensureDB()
    try {
      return await this.db!.getAllFromIndex('chats', 'synced', 0) // 0 for false
    } catch (error) {
      console.error('Failed to get unsynced chats:', error)
      return []
    }
  }

  async markChatSynced(chatId: string): Promise<void> {
    await this.ensureDB()
    try {
      const chat = await this.db!.get('chats', chatId)
      if (chat) {
        chat.synced = true
        chat.lastUpdated = Date.now()
        await this.db!.put('chats', chat)
      }
    } catch (error) {
      console.error('Failed to mark chat as synced:', error)
      throw error
    }
  }

  async deleteChat(chatId: string): Promise<void> {
    await this.ensureDB()
    try {
      await this.db!.delete('chats', chatId)
      // Also delete all messages for this chat
      const messages = await this.db!.getAllFromIndex('messages', 'chatId', chatId)
      for (const message of messages) {
        await this.db!.delete('messages', message.id)
      }
      console.log('Chat deleted from offline storage:', chatId)
    } catch (error) {
      console.error('Failed to delete chat:', error)
      throw error
    }
  }

  // Message operations
  async saveMessage(message: OfflineMessage): Promise<void> {
    await this.ensureDB()
    try {
      await this.db!.put('messages', message)
      
      // Update the chat's message list if it exists
      const chat = await this.getChat(message.chatId)
      if (chat) {
        const existingIndex = chat.messages.findIndex(m => m.id === message.id)
        if (existingIndex >= 0) {
          chat.messages[existingIndex] = message
        } else {
          chat.messages.push(message)
        }
        chat.messages.sort((a, b) => a.timestamp - b.timestamp)
        await this.saveChat(chat)
      }
      
      console.log('Message saved offline:', message.id)
    } catch (error) {
      console.error('Failed to save message offline:', error)
      throw error
    }
  }

  async getMessagesForChat(chatId: string): Promise<OfflineMessage[]> {
    await this.ensureDB()
    try {
      const messages = await this.db!.getAllFromIndex('messages', 'chatId', chatId)
      return messages.sort((a, b) => a.timestamp - b.timestamp)
    } catch (error) {
      console.error('Failed to get messages for chat:', error)
      return []
    }
  }

  async getUnsyncedMessages(): Promise<OfflineMessage[]> {
    await this.ensureDB()
    try {
      return await this.db!.getAllFromIndex('messages', 'synced', 0) // 0 for false
    } catch (error) {
      console.error('Failed to get unsynced messages:', error)
      return []
    }
  }

  async markMessageSynced(messageId: string): Promise<void> {
    await this.ensureDB()
    try {
      const message = await this.db!.get('messages', messageId)
      if (message) {
        message.synced = true
        await this.db!.put('messages', message)
      }
    } catch (error) {
      console.error('Failed to mark message as synced:', error)
      throw error
    }
  }

  // Pending actions operations
  async addPendingAction(action: Omit<PendingAction, 'id' | 'timestamp' | 'retryCount'>): Promise<string> {
    await this.ensureDB()
    try {
      const actionId = `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const pendingAction: PendingAction = {
        ...action,
        id: actionId,
        timestamp: Date.now(),
        retryCount: 0,
      }
      
      await this.db!.put('pendingActions', pendingAction)
      console.log('Pending action added:', actionId)
      return actionId
    } catch (error) {
      console.error('Failed to add pending action:', error)
      throw error
    }
  }

  async getPendingActions(): Promise<PendingAction[]> {
    await this.ensureDB()
    try {
      const actions = await this.db!.getAll('pendingActions')
      return actions.sort((a, b) => a.timestamp - b.timestamp)
    } catch (error) {
      console.error('Failed to get pending actions:', error)
      return []
    }
  }

  async removePendingAction(actionId: string): Promise<void> {
    await this.ensureDB()
    try {
      await this.db!.delete('pendingActions', actionId)
      console.log('Pending action removed:', actionId)
    } catch (error) {
      console.error('Failed to remove pending action:', error)
      throw error
    }
  }

  async incrementRetryCount(actionId: string): Promise<void> {
    await this.ensureDB()
    try {
      const action = await this.db!.get('pendingActions', actionId)
      if (action) {
        action.retryCount += 1
        await this.db!.put('pendingActions', action)
      }
    } catch (error) {
      console.error('Failed to increment retry count:', error)
      throw error
    }
  }

  // Settings operations
  async saveSetting(key: string, valueToSave: Record<string, unknown>): Promise<void> {
    await this.ensureDB();
    try {
      // Store an object { key: theKey, actualValue: theValue }
      await this.db!.put('settings', { key: key, actualValue: valueToSave });
    } catch (error) {
      console.error('Failed to save setting:', error);
      throw error;
    }
  }

  async getSetting(key: string): Promise<Record<string, unknown> | null> {
    await this.ensureDB();
    try {
      const storedObject = await this.db!.get('settings', key); // Retrieves { key: string, actualValue: Record<string, unknown> } | undefined
      return storedObject ? storedObject.actualValue : null;
    } catch (error) {
      console.error('Failed to get setting:', error);
      return null;
    }
  }

  // Utility methods
  async clearAllData(): Promise<void> {
    await this.ensureDB()
    try {
      await this.db!.clear('chats')
      await this.db!.clear('messages')
      await this.db!.clear('pendingActions')
      await this.db!.clear('settings')
      console.log('All offline data cleared')
    } catch (error) {
      console.error('Failed to clear offline data:', error)
      throw error
    }
  }

  async getStorageStats(): Promise<{
    chats: number
    messages: number
    pendingActions: number
    settings: number
  }> {
    await this.ensureDB()
    try {
      const [chats, messages, pendingActions, settings] = await Promise.all([
        this.db!.count('chats'),
        this.db!.count('messages'),
        this.db!.count('pendingActions'),
        this.db!.count('settings'),
      ])

      return { chats, messages, pendingActions, settings }
    } catch (error) {
      console.error('Failed to get storage stats:', error)
      return { chats: 0, messages: 0, pendingActions: 0, settings: 0 }
    }
  }

  private async ensureDB(): Promise<void> {
    if (!this.db) {
      await this.init()
    }
  }

  // Close database connection
  async close(): Promise<void> {
    if (this.db) {
      this.db.close()
      this.db = null
      console.log('Offline storage connection closed')
    }
  }
}

// Export singleton instance
export const offlineStorage = new OfflineStorage()

// Utility functions for common operations
export const createOfflineMessage = (
  chatId: string,
  content: string,
  role: 'user' | 'assistant'
): OfflineMessage => ({
  id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  chatId,
  content,
  role,
  timestamp: Date.now(),
  synced: false,
})

export const createOfflineChat = (
  title: string,
  initialMessage?: OfflineMessage
): OfflineChat => ({
  id: `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  title,
  messages: initialMessage ? [initialMessage] : [],
  timestamp: Date.now(),
  synced: false,
  lastUpdated: Date.now(),
}) 