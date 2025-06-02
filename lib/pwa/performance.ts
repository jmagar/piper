// PWA Performance Optimization Utilities

// Web Performance API type declarations
interface LayoutShift extends PerformanceEntry {
  value: number
  hadRecentInput: boolean
}

interface NetworkInformation {
  effectiveType: string
  downlink: number
  rtt: number
  addEventListener: (type: string, listener: () => void) => void
}

declare global {
  interface Navigator {
    connection?: NetworkInformation
  }
}

interface PerformanceMetrics {
  fcp: number // First Contentful Paint
  lcp: number // Largest Contentful Paint
  fid: number // First Input Delay
  cls: number // Cumulative Layout Shift
  ttfb: number // Time to First Byte
}

interface CacheStats {
  totalSize: number
  entryCount: number
  oldestEntry: number
  newestEntry: number
}

class PWAPerformanceManager {
  private metrics: Partial<PerformanceMetrics> = {}
  private readonly MAX_CACHE_SIZE = 50 * 1024 * 1024 // 50MB
  private readonly CACHE_CLEANUP_THRESHOLD = 0.8 // Clean when 80% full

  // Measure and track Core Web Vitals
  trackPerformance(): void {
    this.measureFCP()
    this.measureLCP()
    this.measureFID()
    this.measureCLS()
    this.measureTTFB()
  }

  private measureFCP(): void {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint')
      if (fcpEntry) {
        this.metrics.fcp = fcpEntry.startTime
        console.log('[PWA Performance] FCP:', fcpEntry.startTime)
      }
    })
    observer.observe({ type: 'paint', buffered: true })
  }

  private measureLCP(): void {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const lastEntry = entries[entries.length - 1]
      this.metrics.lcp = lastEntry.startTime
      console.log('[PWA Performance] LCP:', lastEntry.startTime)
    })
    observer.observe({ type: 'largest-contentful-paint', buffered: true })
  }

  private measureFID(): void {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach((entry) => {
        const fidEntry = entry as PerformanceEventTiming
        this.metrics.fid = fidEntry.processingStart - fidEntry.startTime
        console.log('[PWA Performance] FID:', this.metrics.fid)
      })
    })
    observer.observe({ type: 'first-input', buffered: true })
  }

  private measureCLS(): void {
    let clsValue = 0
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach((entry) => {
        const clsEntry = entry as LayoutShift
        if (!clsEntry.hadRecentInput) {
          clsValue += clsEntry.value
        }
      })
      this.metrics.cls = clsValue
      console.log('[PWA Performance] CLS:', clsValue)
    })
    observer.observe({ type: 'layout-shift', buffered: true })
  }

  private measureTTFB(): void {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const navigationEntry = entries[0] as PerformanceNavigationTiming
      if (navigationEntry) {
        this.metrics.ttfb = navigationEntry.responseStart - navigationEntry.requestStart
        console.log('[PWA Performance] TTFB:', this.metrics.ttfb)
      }
    })
    observer.observe({ type: 'navigation', buffered: true })
  }

  getMetrics(): Partial<PerformanceMetrics> {
    return { ...this.metrics }
  }

  // Cache management
  async getCacheStats(): Promise<CacheStats> {
    const cacheNames = await caches.keys()
    let totalSize = 0
    let entryCount = 0
    let oldestEntry = Date.now()
    let newestEntry = 0

    for (const cacheName of cacheNames) {
      if (cacheName.startsWith('piper-')) {
        const cache = await caches.open(cacheName)
        const requests = await cache.keys()
        entryCount += requests.length

        for (const request of requests) {
          const response = await cache.match(request)
          if (response) {
            const blob = await response.blob()
            totalSize += blob.size

            // Estimate entry age (rough approximation)
            const url = new URL(request.url)
            const timestamp = parseInt(url.searchParams.get('t') || '0') || Date.now()
            oldestEntry = Math.min(oldestEntry, timestamp)
            newestEntry = Math.max(newestEntry, timestamp)
          }
        }
      }
    }

    return {
      totalSize,
      entryCount,
      oldestEntry,
      newestEntry
    }
  }

  async cleanupCaches(): Promise<void> {
    console.log('[PWA Performance] Starting cache cleanup')
    
    const stats = await this.getCacheStats()
    
    if (stats.totalSize < this.MAX_CACHE_SIZE * this.CACHE_CLEANUP_THRESHOLD) {
      console.log('[PWA Performance] Cache cleanup not needed')
      return
    }

    const cacheNames = await caches.keys()
    const piperCaches = cacheNames.filter(name => name.startsWith('piper-'))

    // Clean up old entries from each cache
    for (const cacheName of piperCaches) {
      await this.cleanupCache(cacheName)
    }

    console.log('[PWA Performance] Cache cleanup completed')
  }

  private async cleanupCache(cacheName: string): Promise<void> {
    const cache = await caches.open(cacheName)
    const requests = await cache.keys()
    
    // Sort by last accessed (if available) or by URL
    const sortedRequests = Array.from(requests).sort((a: Request, b: Request) => {
      const aTime = parseInt(new URL(a.url).searchParams.get('t') || '0')
      const bTime = parseInt(new URL(b.url).searchParams.get('t') || '0')
      return aTime - bTime // Oldest first
    })

    // Remove oldest 25% of entries
    const entriesToRemove = Math.floor(sortedRequests.length * 0.25)
    const requestsToDelete = sortedRequests.slice(0, entriesToRemove)

    for (const request of requestsToDelete) {
      await cache.delete(request)
      console.log('[PWA Performance] Removed cached entry:', request.url)
    }
  }

  // Preload critical resources
  async preloadCriticalResources(): Promise<void> {
    if (!('serviceWorker' in navigator)) return

    const registration = await navigator.serviceWorker.ready
    if (registration.active) {
      registration.active.postMessage({
        type: 'PRELOAD_CRITICAL',
        resources: [
          '/',
          '/manifest.json',
          '/icons/icon-192x192.png',
          '/icons/icon-512x512.png',
          // Add other critical resources
        ]
      })
    }
  }

  // Monitor network quality
  monitorNetworkQuality(): void {
    if ('connection' in navigator && navigator.connection) {
      const connection = navigator.connection
      
      console.log('[PWA Performance] Network type:', connection.effectiveType)
      console.log('[PWA Performance] Downlink:', connection.downlink)
      console.log('[PWA Performance] RTT:', connection.rtt)

      connection.addEventListener('change', () => {
        if (navigator.connection) {
          console.log('[PWA Performance] Network changed:', {
            effectiveType: navigator.connection.effectiveType,
            downlink: navigator.connection.downlink,
            rtt: navigator.connection.rtt
          })
        }
      })
    }
  }

  // Resource hints for better loading
  addResourceHints(): void {
    const head = document.head

    // Preconnect to external domains
    const preconnectDomains = [
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com'
    ]

    preconnectDomains.forEach(domain => {
      const link = document.createElement('link')
      link.rel = 'preconnect'
      link.href = domain
      link.crossOrigin = 'anonymous'
      head.appendChild(link)
    })

    // DNS prefetch for API domains
    const dnsPrefetchDomains = [
      'https://api.openai.com'
    ]

    dnsPrefetchDomains.forEach(domain => {
      const link = document.createElement('link')
      link.rel = 'dns-prefetch'
      link.href = domain
      head.appendChild(link)
    })
  }

  // Bundle optimization suggestions
  analyzeBundles(): void {
    if (process.env.NODE_ENV === 'development') {
      console.log('[PWA Performance] Bundle analysis enabled in development')
      
      // Analyze loaded scripts
      const scripts = Array.from(document.scripts)
      scripts.forEach(script => {
        if (script.src && script.src.includes('/_next/')) {
          console.log('[PWA Performance] Script bundle:', script.src)
        }
      })
    }
  }

  // Service Worker update check
  async checkForUpdates(): Promise<boolean> {
    if (!('serviceWorker' in navigator)) return false

    const registration = await navigator.serviceWorker.getRegistration()
    if (!registration) return false

    await registration.update()
    return registration.waiting !== null
  }

  // Performance reporting
  reportMetrics(): void {
    const metrics = this.getMetrics()
    
    // Send to analytics or monitoring service
    console.log('[PWA Performance] Performance Report:', {
      ...metrics,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      connection: navigator.connection?.effectiveType || 'unknown'
    })
  }
}

// Singleton instance
export const performanceManager = new PWAPerformanceManager()

// React hook for performance monitoring
import { useState, useEffect } from 'react'

export function usePerformanceMonitoring() {
  const [metrics, setMetrics] = useState<Partial<PerformanceMetrics>>({})
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null)

  useEffect(() => {
    // Start performance tracking
    performanceManager.trackPerformance()
    performanceManager.monitorNetworkQuality()
    performanceManager.addResourceHints()

    // Get initial metrics
    const updateMetrics = () => {
      setMetrics(performanceManager.getMetrics())
    }

    const interval = setInterval(updateMetrics, 5000)
    updateMetrics()

    // Get cache stats
    performanceManager.getCacheStats().then(setCacheStats)

    return () => clearInterval(interval)
  }, [])

  const cleanupCaches = async () => {
    await performanceManager.cleanupCaches()
    const newStats = await performanceManager.getCacheStats()
    setCacheStats(newStats)
  }

  const checkForUpdates = () => {
    return performanceManager.checkForUpdates()
  }

  return {
    metrics,
    cacheStats,
    cleanupCaches,
    checkForUpdates,
    reportMetrics: performanceManager.reportMetrics.bind(performanceManager)
  }
}

// Performance optimization utilities
export const PWAOptimizations = {
  // Lazy load images with intersection observer
  lazyLoadImages: () => {
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement
            img.src = img.dataset.src || ''
            img.classList.remove('lazy')
            imageObserver.unobserve(img)
          }
        })
      })

      document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img)
      })
    }
  },

  // Optimize font loading
  optimizeFonts: () => {
    if ('fonts' in document) {
      document.fonts.ready.then(() => {
        console.log('[PWA Performance] Fonts loaded')
      })
    }
  },

  // Reduce JavaScript bundle size
  checkBundleSize: () => {
    if (process.env.NODE_ENV === 'development') {
      const scripts = Array.from(document.scripts)
      let totalSize = 0
      
      scripts.forEach(script => {
        if (script.src && script.src.includes('/_next/')) {
          // Estimate size (actual size would need server-side measurement)
          totalSize += 1000 // Placeholder
        }
      })
      
      console.log('[PWA Performance] Estimated bundle size:', totalSize, 'KB')
    }
  }
} 