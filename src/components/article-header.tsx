import { memo } from 'react'
import Link from 'next/link'
import { Calendar, Clock, ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import type { BlogPost } from '@/types'

interface ArticleHeaderProps {
  post: BlogPost
}

export const ArticleHeader = memo(({ post }: ArticleHeaderProps) => {
  const { title, author, publishedAt, tags, emoji, readTime } = post

  return (
    <section className="relative">
      <div className="relative h-64 md:h-80 lg:h-96 overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
        <div className="text-white text-center space-y-4">
          <div className="text-9xl">{emoji || '📝'}</div>
          <div className="text-2xl font-semibold">{title}</div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      </div>
      
      {/* Article Header */}
      <div className="container mx-auto max-w-4xl px-4">
        <div className="relative -mt-32 z-10">
          <div className="bg-background/95 backdrop-blur rounded-lg p-8 shadow-lg border">
            {/* Breadcrumb */}
            <nav className="mb-6">
              <Link href="/articles" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                <ArrowLeft className="inline h-4 w-4 mr-1" />
                ← Volver a la lista de artículos
              </Link>
            </nav>

            {/* Tags */}
            {tags && tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Title */}
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 leading-tight">
              {title}
            </h1>

            {/* Meta Info */}
            <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
              {/* Author section - now mandatory */}
              <div className="flex items-center gap-3">
                {author?.avatar && (
                  <img 
                    src={author.avatar} 
                    alt={author.name || 'Author'}
                    className="w-8 h-8 rounded-full"
                    loading="lazy"
                  />
                )}
                <div>
                  <div className="font-medium text-foreground">
                    By {author?.name || 'Unknown Author'}
                  </div>
                  {author?.bio && (
                    <div className="text-xs">{author.bio}</div>
                  )}
                </div>
              </div>
              {publishedAt && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(publishedAt)}</span>
                </div>
              )}
              {readTime && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>{readTime} min read</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
})

ArticleHeader.displayName = 'ArticleHeader'
