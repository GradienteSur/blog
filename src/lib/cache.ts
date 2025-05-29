import { BlogPost } from '@/types'

interface CacheEntry<T> {
  data: T
  timestamp: number
  etag?: string
}

interface CacheStats {
  hits: number
  misses: number
  lastUpdate: number
}

class BlogCache {
  private memoryCache = new Map<string, CacheEntry<any>>()
  private dbName = 'blog-cache'
  private dbVersion = 1
  private storeName = 'cache-entries'
  private maxMemorySize = 100 // Max items in memory
  private persistentCacheTTL = 24 * 60 * 60 * 1000 // 24 hours
  private memoryCacheTTL = 10 * 60 * 1000 // 10 minutes
  private stats: CacheStats = { hits: 0, misses: 0, lastUpdate: 0 }
  private dbPromise: Promise<IDBDatabase> | null = null

  constructor() {
    if (typeof window !== 'undefined') {
      this.initDB()
    }
  }

  private initDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'key' })
        }
      }
    })

    return this.dbPromise
  }

  private getCacheKey(key: string): string {
    return key.replace(/[^a-zA-Z0-9-_]/g, '_')
  }

  // Memory cache operations
  private setMemoryCache<T>(key: string, data: T, etag?: string) {
    // Implement LRU eviction
    if (this.memoryCache.size >= this.maxMemorySize) {
      const firstKey = this.memoryCache.keys().next().value
      if (firstKey) {
        this.memoryCache.delete(firstKey)
      }
    }

    this.memoryCache.set(key, {
      data,
      timestamp: Date.now(),
      etag
    })
  }

  private getMemoryCache<T>(key: string): CacheEntry<T> | null {
    const entry = this.memoryCache.get(key)
    if (!entry) return null

    const isExpired = Date.now() - entry.timestamp > this.memoryCacheTTL
    if (isExpired) {
      this.memoryCache.delete(key)
      return null
    }

    return entry as CacheEntry<T>
  }

  // IndexedDB cache operations
  private async setPersistentCache<T>(key: string, data: T, etag?: string) {
    if (typeof window === 'undefined') return

    try {
      const db = await this.initDB()
      const transaction = db.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      
      const entry = {
        key: this.getCacheKey(key),
        data,
        timestamp: Date.now(),
        etag
      }
      
      await new Promise((resolve, reject) => {
        const request = store.put(entry)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.warn(`Failed to write persistent cache for ${key}:`, error)
    }
  }

  private async getPersistentCache<T>(key: string): Promise<CacheEntry<T> | null> {
    if (typeof window === 'undefined') return null

    try {
      const db = await this.initDB()
      const transaction = db.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      
      const entry = await new Promise<any>((resolve, reject) => {
        const request = store.get(this.getCacheKey(key))
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })

      if (!entry) return null

      const isExpired = Date.now() - entry.timestamp > this.persistentCacheTTL
      if (isExpired) {
        await this.removePersistentCache(key)
        return null
      }

      return { data: entry.data, timestamp: entry.timestamp, etag: entry.etag }
    } catch (error) {
      return null
    }
  }

  private async removePersistentCache(key: string) {
    if (typeof window === 'undefined') return

    try {
      const db = await this.initDB()
      const transaction = db.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      
      await new Promise((resolve, reject) => {
        const request = store.delete(this.getCacheKey(key))
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      // Ignore errors when removing
    }
  }

  // Public API
  async get<T>(key: string): Promise<{ data: T; etag?: string } | null> {
    // Try memory cache first
    const memoryEntry = this.getMemoryCache<T>(key)
    if (memoryEntry) {
      this.stats.hits++
      return { data: memoryEntry.data, etag: memoryEntry.etag }
    }

    // Try persistent cache
    const persistentEntry = await this.getPersistentCache<T>(key)
    if (persistentEntry) {
      // Promote to memory cache
      this.setMemoryCache(key, persistentEntry.data, persistentEntry.etag)
      this.stats.hits++
      return { data: persistentEntry.data, etag: persistentEntry.etag }
    }

    this.stats.misses++
    return null
  }

  async set<T>(key: string, data: T, etag?: string) {
    this.setMemoryCache(key, data, etag)
    await this.setPersistentCache(key, data, etag)
    this.stats.lastUpdate = Date.now()
  }

  async invalidate(key: string) {
    this.memoryCache.delete(key)
    await this.removePersistentCache(key)
  }

  async clear() {
    this.memoryCache.clear()
    
    if (typeof window === 'undefined') return

    try {
      const db = await this.initDB()
      const transaction = db.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      
      await new Promise((resolve, reject) => {
        const request = store.clear()
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.warn('Failed to clear persistent cache:', error)
    }
  }

  getStats(): CacheStats {
    return { ...this.stats }
  }
}

export const blogCache = new BlogCache()
