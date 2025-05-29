'use client'

import { useState, useEffect, memo, useCallback } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Calendar, Clock, User, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import { fetchBlogPosts } from '@/lib/github'
import type { BlogPost } from '@/types'

interface FeaturedPostProps {
  posts?: BlogPost[] // Allow posts to be passed from parent to avoid duplicate fetching
}

function FeaturedPostComponent({ posts: externalPosts }: FeaturedPostProps) {
  const [post, setPost] = useState<BlogPost | null>(null)
  const [loading, setLoading] = useState(!externalPosts)
  const [error, setError] = useState<string | null>(null)

  const loadFeaturedPost = useCallback(async () => {
    try {
      setLoading(true)
      let postsToSearch: BlogPost[]
      
      if (externalPosts && externalPosts.length > 0) {
        postsToSearch = externalPosts
      } else {
        postsToSearch = await fetchBlogPosts()
      }
      
      const featuredPost = postsToSearch.find(post => post.featured === true) || postsToSearch[0]
      setPost(featuredPost || null)
      setError(null)
    } catch (err) {
      setError('Failed to load featured post')
      console.error('Error loading featured post:', err)
    } finally {
      setLoading(false)
    }
  }, [externalPosts])

  useEffect(() => {
    if (externalPosts && externalPosts.length > 0) {
      const featuredPost = externalPosts.find(post => post.featured) || externalPosts[0]
      setPost(featuredPost || null)
      setLoading(false)
    } else {
      loadFeaturedPost()
    }
  }, [externalPosts, loadFeaturedPost])

  if (loading) {
    return (
      <section className="py-12">
        <div className="space-y-6">
          <div className="h-8 bg-muted rounded animate-pulse" />
          <div className="h-64 bg-muted rounded-lg animate-pulse" />
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="py-12">
        <div className="text-red-500">{error}</div>
      </section>
    )
  }

  if (!post) return null

  return (
    <section className="py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="space-y-6"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold">Featured Article</h2>
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            Editor's Pick
          </Badge>
        </div>

        <Link href={`/blog/${post.slug}`} className="block">
          <motion.div
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
            className="group relative overflow-hidden rounded-2xl bg-card border shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
          >
            <div className="grid lg:grid-cols-2 gap-0">
              {/* Content */}
              <div className="p-8 lg:p-12 flex flex-col justify-center">
                <div className="space-y-6">
                  {/* Meta */}
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>{post.author.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(post.publishedAt)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>{post.readTime} min read</span>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-2xl lg:text-3xl font-bold leading-tight group-hover:text-primary transition-colors">
                    {post.title}
                  </h3>

                  {/* Excerpt */}
                  <p className="text-muted-foreground text-lg leading-relaxed">
                    {post.excerpt}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2">
                    {post.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  {/* CTA */}
                  <Button className="w-fit group/btn pointer-events-none">
                    <span>
                      Read Article
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                    </span>
                  </Button>
                </div>
              </div>

              {/* Emoji Display */}
              <div className="relative h-64 lg:h-full min-h-[300px] bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <div className="text-white text-center space-y-4">
                  <div className="text-8xl">{post.emoji}</div>
                  <div className="text-xl font-semibold">{post.title}</div>
                  <div className="text-sm opacity-80">Featured Article</div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              </div>
            </div>

            {/* Hover effect overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </motion.div>
        </Link>
      </motion.div>
    </section>
  )
}

export const FeaturedPost = memo(FeaturedPostComponent)
