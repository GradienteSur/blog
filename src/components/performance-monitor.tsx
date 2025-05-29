'use client'

import { useEffect } from 'react'

export function PerformanceMonitor() {
  useEffect(() => {
    // Only run in development or when explicitly enabled
    if (process.env.NODE_ENV !== 'development' && !process.env.NEXT_PUBLIC_ENABLE_PERF_MONITOR) {
      return
    }

    let startTime = performance.now()

    // Monitor Core Web Vitals
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'measure') {
          console.log(`⚡ ${entry.name}: ${entry.duration.toFixed(2)}ms`)
        }
        
        // Enhanced navigation timing
        if (entry.entryType === 'navigation') {
          const nav = entry as PerformanceNavigationTiming
          const metrics = {
            'DNS Lookup': nav.domainLookupEnd - nav.domainLookupStart,
            'TCP Connection': nav.connectEnd - nav.connectStart,
            'Server Response': nav.responseStart - nav.requestStart,
            'DOM Loading': nav.domContentLoadedEventEnd - nav.responseEnd,
            'Total Load Time': nav.loadEventEnd - nav.fetchStart,
            'Time to First Byte': nav.responseStart - nav.fetchStart,
            'DOM Interactive': nav.domInteractive - nav.fetchStart,
          }
          console.log('📊 Navigation Timing:', metrics)
          
          // Warn about slow metrics
          if (metrics['Total Load Time'] > 3000) {
            console.warn('⚠️ Slow page load detected:', metrics['Total Load Time'], 'ms')
          }
        }

        // Monitor LCP (Largest Contentful Paint)
        if (entry.entryType === 'largest-contentful-paint') {
          const lcp = entry.startTime
          console.log(`🎯 LCP: ${lcp.toFixed(2)}ms`)
          if (lcp > 2500) {
            console.warn('⚠️ Poor LCP performance:', lcp, 'ms')
          }
        }

        // Monitor FID (First Input Delay)
        if (entry.entryType === 'first-input') {
          const fid = (entry as any).processingStart - entry.startTime
          console.log(`👆 FID: ${fid.toFixed(2)}ms`)
          if (fid > 100) {
            console.warn('⚠️ Poor FID performance:', fid, 'ms')
          }
        }

        // Monitor CLS (Cumulative Layout Shift)
        if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
          console.log(`📐 Layout Shift: ${(entry as any).value.toFixed(4)}`)
        }
      }
    })

    // Observe multiple entry types
    try {
      observer.observe({ entryTypes: ['measure', 'navigation', 'largest-contentful-paint', 'first-input', 'layout-shift'] })
    } catch (e) {
      // Fallback for older browsers
      observer.observe({ entryTypes: ['measure', 'navigation'] })
    }

    observer.observe({ entryTypes: ['measure', 'navigation'] })

    // Monitor bundle loading
    const markBundleStart = () => {
      performance.mark('bundle-start')
    }

    const markBundleEnd = () => {
      performance.mark('bundle-end')
      performance.measure('bundle-load-time', 'bundle-start', 'bundle-end')
    }

    // Mark when critical components load
    markBundleStart()
    
    // Clean up
    return () => {
      observer.disconnect()
      markBundleEnd()
    }
  }, [])

  return null
}
