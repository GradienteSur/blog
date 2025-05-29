'use client'

import React, { Suspense, lazy } from 'react'
import { BlogPost } from '@/types'

// Lazy load the heavy latest posts component
const LatestPostsOptimized = lazy(() => 
  import('./latest-posts-optimized').then(module => ({ 
    default: module.LatestPosts 
  }))
)

// Lightweight loading fallback
const LoadingFallback = () => (
  <section className="py-12">
    <div className="space-y-8">
      <div className="h-8 bg-muted rounded animate-pulse" />
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-80 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    </div>
  </section>
)

interface LazyLatestPostsProps {
  posts?: BlogPost[]
  limit?: number
}

export function LazyLatestPosts({ posts, limit = 6 }: LazyLatestPostsProps) {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <LatestPostsOptimized posts={posts} limit={limit} />
    </Suspense>
  )
}
