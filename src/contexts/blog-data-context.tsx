'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { githubClient } from '@/lib/github'
import type { BlogPost } from '@/types'

interface BlogDataContextType {
  posts: BlogPost[]
  featuredPost: BlogPost | null
  latestPosts: BlogPost[]
  loading: boolean
  error: string | null
  refreshData: () => Promise<void>
}

const BlogDataContext = createContext<BlogDataContextType | undefined>(undefined)

interface BlogDataProviderProps {
  children: ReactNode
}

export function BlogDataProvider({ children }: BlogDataProviderProps) {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [featuredPost, setFeaturedPost] = useState<BlogPost | null>(null)
  const [latestPosts, setLatestPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBlogData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Use the existing GitHub client to fetch all posts
      const allPosts = await githubClient.fetchBlogPosts()

      // Set featured post (first post marked as featured, or latest post)
      const featured = allPosts.find(post => post.featured) || allPosts[0] || null
      
      // Set latest posts (excluding featured post, take next 3)
      const latest = allPosts
        .filter(post => post.slug !== featured?.slug)
        .slice(0, 3)

      setPosts(allPosts)
      setFeaturedPost(featured)
      setLatestPosts(latest)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch blog data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBlogData()
  }, [])

  const value: BlogDataContextType = {
    posts,
    featuredPost,
    latestPosts,
    loading,
    error,
    refreshData: fetchBlogData
  }

  return (
    <BlogDataContext.Provider value={value}>
      {children}
    </BlogDataContext.Provider>
  )
}

export function useBlogData() {
  const context = useContext(BlogDataContext)
  if (context === undefined) {
    throw new Error('useBlogData must be used within a BlogDataProvider')
  }
  return context
}