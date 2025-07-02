import {
  createStore,
  del,
  delMany,
  get,
  getMany,
  keys,
  set,
  setMany,
} from "idb-keyval"

let dbReady = false
let dbInitPromise: Promise<void> | null = null
const stores: Record<string, any> = {}

const isClient = typeof window !== "undefined"
const DB_NAME = "piper-db"
const DB_VERSION = 2

let storesReady = false
let storesReadyResolve: () => void = () => {}
const storesReadyPromise = new Promise<void>((resolve) => {
  storesReadyResolve = resolve
})

// Add initialization lock to prevent race conditions
let initializationLock = false

function initDatabase() {
  if (!isClient) return Promise.resolve()

  return new Promise<void>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    let dbInstance: IDBDatabase | null = null

    request.onupgradeneeded = (event) => {
      const db = request.result
      dbInstance = db
      
      try {
        if (!db.objectStoreNames.contains("chats")) {
          db.createObjectStore("chats")
        }
        if (!db.objectStoreNames.contains("messages")) {
          db.createObjectStore("messages")
        }
        if (!db.objectStoreNames.contains("sync")) {
          db.createObjectStore("sync")
        }
      } catch (error) {
        console.error('Error creating object stores:', error)
        reject(error)
      }
    }

    request.onsuccess = () => {
      try {
        dbReady = true
        dbInstance = request.result
        
        // Properly close the database connection
        if (dbInstance) {
          dbInstance.close()
        }
        resolve()
      } catch (error) {
        reject(error)
      }
    }

    request.onerror = () => {
      console.error('Database initialization failed:', request.error)
      if (dbInstance) {
        try {
          dbInstance.close()
        } catch (closeError) {
          console.warn('Error closing database:', closeError)
        }
      }
      reject(request.error)
    }

    // Add timeout to prevent hanging
    setTimeout(() => {
      if (!dbReady) {
        reject(new Error('Database initialization timeout'))
      }
    }, 10000)
  })
}

if (isClient) {
  // Use initialization lock to prevent race conditions
  if (!initializationLock) {
    initializationLock = true
    initDatabaseAndStores().catch((error) => {
      console.error('Failed to initialize database and stores:', error)
      initializationLock = false
    })
  }
}

async function initDatabaseAndStores(): Promise<void> {
  try {
    // Initialize database first
    dbInitPromise = initDatabase()
    await dbInitPromise

    // Create stores safely
    try {
      stores.chats = createStore(DB_NAME, "chats")
      stores.messages = createStore(DB_NAME, "messages")
      stores.sync = createStore(DB_NAME, "sync")
      
      storesReady = true
      storesReadyResolve()
      initializationLock = false
      
      console.log('Database and stores initialized successfully')
    } catch (storeError) {
      console.error('Failed to create stores:', storeError)
      // Still mark as ready but with empty stores to prevent hanging
      storesReady = true
      storesReadyResolve()
      initializationLock = false
    }
  } catch (error) {
    console.error("Database initialization failed:", error)
    storesReady = true
    storesReadyResolve()
    initializationLock = false
    throw error
  }
}

export async function ensureDbReady() {
  if (!isClient) {
    console.warn("ensureDbReady: not client")
    return
  }
  if (dbInitPromise) await dbInitPromise
  if (!storesReady) await storesReadyPromise
}

export async function readFromIndexedDB<T>(
  table: "chats" | "messages" | "sync",
  key?: string
): Promise<T | T[]> {
  await ensureDbReady()

  if (!isClient) {
    console.warn("readFromIndexedDB: not client")
    return key ? (null as any) : []
  }

  if (!stores[table]) {
    console.warn("readFromIndexedDB: store not initialized")
    return key ? (null as any) : []
  }

  try {
    const store = stores[table]
    if (key) {
      const result = await get<T>(key, store)
      return result as T
    }

    const allKeys = await keys(store)
    if (allKeys.length > 0) {
      const results = await getMany<T>(allKeys as string[], store)
      return results.filter(Boolean)
    }

    return []
  } catch (error) {
    console.error(`readFromIndexedDB failed (${table}):`, error)
    // Throw error instead of silently failing
    throw new Error(`Failed to read from IndexedDB table '${table}': ${error instanceof Error ? error.message : String(error)}`)
  }
}

export async function writeToIndexedDB<T extends { id: string | number }>(
  table: "chats" | "messages" | "sync",
  data: T | T[]
): Promise<void> {
  await ensureDbReady()

  if (!isClient) {
    console.warn("writeToIndexedDB: not client")
    return
  }

  if (!stores[table]) {
    console.warn("writeToIndexedDB: store not initialized")
    return
  }

  try {
    const store = stores[table]
    const entries: [IDBValidKey, T][] = Array.isArray(data)
      ? data.map((item) => [item.id, item])
      : [[data.id, data]]

    await setMany(entries, store)
  } catch (error) {
    console.error(`writeToIndexedDB failed (${table}):`, error)
    throw new Error(`Failed to write to IndexedDB table '${table}': ${error instanceof Error ? error.message : String(error)}`)
  }
}

export async function deleteFromIndexedDB(
  table: "chats" | "messages" | "sync",
  key?: string
): Promise<void> {
  await ensureDbReady()

  if (!isClient) {
    console.warn("deleteFromIndexedDB: not client")
    return
  }

  const store = stores[table]
  if (!store) {
    console.warn(`Store '${table}' not initialized.`)
    return
  }

  try {
    if (key) {
      await del(key, store)
    } else {
      const allKeys = await keys(store)
      await delMany(allKeys as string[], store)
    }
  } catch (error) {
    console.error(`Error deleting from IndexedDB store '${table}':`, error)
  }
}

export async function clearAllIndexedDBStores() {
  if (!isClient) {
    console.warn("clearAllIndexedDBStores: not client")
    return
  }

  await ensureDbReady()
  await deleteFromIndexedDB("chats")
  await deleteFromIndexedDB("messages")
  await deleteFromIndexedDB("sync")
}
