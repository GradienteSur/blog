import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, formatDistanceToNow } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Memoization cache for expensive operations
const memoCache = new Map()

function memoize<T extends (...args: any[]) => any>(fn: T, keyFn?: (...args: Parameters<T>) => string): T {
  return ((...args: Parameters<T>) => {
    const key = keyFn ? keyFn(...args) : JSON.stringify(args)
    
    if (memoCache.has(key)) {
      return memoCache.get(key)
    }
    
    const result = fn(...args)
    
    // Limit cache size to prevent memory leaks
    if (memoCache.size > 100) {
      const firstKey = memoCache.keys().next().value
      memoCache.delete(firstKey)
    }
    
    memoCache.set(key, result)
    return result
  }) as T
}

export const formatDate = memoize((date: string | Date) => {
  return format(new Date(date), "MMMM dd, yyyy")
}, (date) => typeof date === 'string' ? date : date.toISOString())

export const formatRelativeDate = memoize((date: string | Date) => {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}, (date) => typeof date === 'string' ? date : date.toISOString())

export const calculateReadTime = memoize((content: string): number => {
  const wordsPerMinute = 200
  const words = content.trim().split(/\s+/).length
  return Math.ceil(words / wordsPerMinute)
})

export const generateSlug = memoize((title: string): string => {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
})

export const extractExcerpt = memoize((content: string, maxLength: number = 160): string => {
  const text = content.replace(/[#*`\n]/g, ' ').trim()
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).replace(/\s+\S*$/, '') + '...'
}, (content, maxLength) => `${content.slice(0, 50)}-${maxLength}`)

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}
