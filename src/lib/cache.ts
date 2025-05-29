import fs from 'fs/promises'
import path from 'path'
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
  private cacheDir: string
  private maxMemorySize = 100 // Max items in memory
  private diskCacheTTL = 24 * 60 * 60 * 1000 // 24 hours
  private memoryCacheTTL = 10 * 60 * 1000 // 10 minutes
  private stats: CacheStats = { hits: 0, misses: 0, lastUpdate: 0 }

  constructor() {
    this.cacheDir = path.join(process.cwd(), '.cache', 'blog')
    this.ensureCacheDir()
  }

  private async ensureCacheDir() {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true })
    } catch (error) {
      console.warn('Failed to create cache directory:', error)
    }
  }

  private getCacheKey(key: string): string {
    return key.replace(/[^a-zA-Z0-9-_]/g, '_')
  }

  private getFilePath(key: string): string {
    return path.join(this.cacheDir, `${this.getCacheKey(key)}.json`)
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

  // Disk cache operations
  private async setDiskCache<T>(key: string, data: T, etag?: string) {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        etag
      }
      await fs.writeFile(this.getFilePath(key), JSON.stringify(entry, null, 2))
    } catch (error) {
      console.warn(`Failed to write disk cache for ${key}:`, error)
    }
  }

  private async getDiskCache<T>(key: string): Promise<CacheEntry<T> | null> {
    try {
      const filePath = this.getFilePath(key)
      const content = await fs.readFile(filePath, 'utf-8')
      const entry: CacheEntry<T> = JSON.parse(content)

      const isExpired = Date.now() - entry.timestamp > this.diskCacheTTL
      if (isExpired) {
        await fs.unlink(filePath).catch(() => {}) // Clean up expired cache
        return null
      }

      return entry
    } catch (error) {
      return null // File doesn't exist or is corrupted
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

    // Try disk cache
    const diskEntry = await this.getDiskCache<T>(key)
    if (diskEntry) {
      // Promote to memory cache
      this.setMemoryCache(key, diskEntry.data, diskEntry.etag)
      this.stats.hits++
      return { data: diskEntry.data, etag: diskEntry.etag }
    }

    this.stats.misses++
    return null
  }

  async set<T>(key: string, data: T, etag?: string) {
    this.setMemoryCache(key, data, etag)
    await this.setDiskCache(key, data, etag)
    this.stats.lastUpdate = Date.now()
  }

  async invalidate(key: string) {
    this.memoryCache.delete(key)
    try {
      await fs.unlink(this.getFilePath(key))
    } catch (error) {
      // File might not exist, ignore
    }
  }

  async clear() {
    this.memoryCache.clear()
    try {
      const files = await fs.readdir(this.cacheDir)
      await Promise.all(
        files.map(file => fs.unlink(path.join(this.cacheDir, file)))
      )
    } catch (error) {
      console.warn('Failed to clear disk cache:', error)
    }
  }

  getStats(): CacheStats {
    return { ...this.stats }
  }
}

export const blogCache = new BlogCache()
