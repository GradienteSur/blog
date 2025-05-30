'use client'

import { memo } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Calendar, Clock, ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useBlogData } from '@/contexts/blog-data-context'
import type { BlogPost } from '@/types'

interface FeaturedPostProps {
  post?: BlogPost
}

function FeaturedPostComponent({ post: externalPost }: FeaturedPostProps) {
  const { featuredPost, loading, error } = useBlogData()
  
  const post = externalPost || featuredPost

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg overflow-hidden animate-pulse">
        <div className="h-48 bg-gray-200"></div>
        <div className="p-6">
          <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-600">Error loading featured post: {error}</p>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <p className="text-gray-500 text-center">No featured post available</p>
      </div>
    )
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
    >
      <div className="relative h-48 bg-gradient-to-br from-blue-500 to-purple-600 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center text-white">
          <div className="text-center space-y-2">
            <div className="text-6xl">{post.emoji || '📄'}</div>
            <div className="text-sm font-medium">{post.title}</div>
          </div>
        </div>
        <div className="absolute top-4 left-4">
          <Badge variant="secondary" className="bg-blue-600 text-white">
            Featured
          </Badge>
        </div>
      </div>
      
      <div className="p-6">
        <div className="flex items-center gap-4 mb-4 text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <time dateTime={post.publishedAt}>
              {new Date(post.publishedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </time>
          </div>
          
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{post.readTime} min read</span>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-3 leading-tight">
          <Link
            href={`/articles/${post.slug}`}
            className="hover:text-blue-600 transition-colors"
          >
            {post.title}
          </Link>
        </h2>

        <p className="text-gray-600 mb-4 line-clamp-3">
          {post.excerpt}
        </p>

        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {post.tags.slice(0, 3).map(tag => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {post.author && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="w-8 h-8">
                <AvatarImage src={post.author.avatar} alt={post.author.name} />
                <AvatarFallback>
                  {post.author.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {post.author.name}
                </p>
              </div>
            </div>
            
            <Link
              href={`/articles/${post.slug}`}
              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 transition-colors text-sm font-medium"
            >
              Leer más
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </motion.article>
  )
}

export const FeaturedPost = memo(FeaturedPostComponent)