'use client'

import { useState, useEffect, memo, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Calendar, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { formatRelativeDate } from '@/lib/utils'
import { fetchBlogPosts } from '@/lib/github'
import type { BlogPost } from '@/types'
import { useBlogData } from '@/contexts/blog-data-context'

interface LatestPostsProps {
	posts?: BlogPost[] // Allow posts to be passed from parent to avoid duplicate fetching
	limit?: number // Limit number of posts to display
}

const PostCard = memo(({ post, index }: { post: BlogPost; index: number }) => (
	<motion.div
		key={post.id}
		initial={{ opacity: 0, y: 20 }}
		animate={{ opacity: 1, y: 0 }}
		transition={{ duration: 0.5, delay: 0.1 * index }}
		whileHover={{ y: -4 }}
		className="group cursor-pointer"
	>
		<Link href={`/articles/${post.slug}`}>
			<div className="h-full bg-card border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
				{/* Image placeholder */}
				<div className="h-48 bg-gradient-to-br from-blue-500 to-purple-600 relative overflow-hidden">
					<div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
					<div className="absolute inset-0 flex items-center justify-center text-white">
						<div className="text-center space-y-2">
							<div className="text-6xl">{post.emoji || '📄'}</div>
							<div className="text-sm font-medium">{post.title}</div>
						</div>
					</div>
					{/* Hover overlay */}
					<div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
				</div>

				<div className="p-6 space-y-4">
					{/* Meta info */}
					<div className="flex items-center justify-between text-xs text-muted-foreground">
						<div className="flex items-center gap-2">
							<Avatar className="h-6 w-6">
								<AvatarImage src={post.author.avatar} />
								<AvatarFallback className="text-xs">
									{post.author.name
										.split(' ')
										.map(n => n[0])
										.join('')}
								</AvatarFallback>
							</Avatar>
							<span>{post.author.name}</span>
						</div>
						<div className="flex items-center gap-1">
							<Clock className="h-3 w-3" />
							<span>{post.readTime}m</span>
						</div>
					</div>

					{/* Title */}
					<h3 className="text-lg font-semibold leading-tight group-hover:text-primary transition-colors line-clamp-2">
						{post.title}
					</h3>

					{/* Excerpt */}
					<p className="text-sm text-muted-foreground line-clamp-3">
						{post.excerpt}
					</p>

					{/* Tags */}
					<div className="flex flex-wrap gap-1">
						{post.tags.slice(0, 2).map(tag => (
							<Badge key={tag} variant="outline" className="text-xs">
								{tag}
							</Badge>
						))}
						{post.tags.length > 2 && (
							<Badge variant="outline" className="text-xs">
								+{post.tags.length - 2}
							</Badge>
						)}
					</div>

					{/* Date */}
					<div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
						<Calendar className="h-3 w-3" />
						<span>{formatRelativeDate(post.publishedAt)}</span>
					</div>
				</div>
			</div>
		</Link>
	</motion.div>
))

PostCard.displayName = 'PostCard'

function LatestPostsComponent({ posts: externalPosts, limit = 6 }: LatestPostsProps) {
	const [posts, setPosts] = useState<BlogPost[]>([])
	const [loading, setLoading] = useState(!externalPosts)
	const [error, setError] = useState<string | null>(null)

	const loadPosts = useCallback(async () => {
		try {
			setLoading(true)
			const fetchedPosts = await fetchBlogPosts()
			setPosts(fetchedPosts)
			setError(null)
		} catch (err) {
			setError('Failed to load blog posts')
			console.error('Error loading posts:', err)
		} finally {
			setLoading(false)
		}
	}, [])

	useEffect(() => {
		if (externalPosts && externalPosts.length > 0) {
			setPosts(externalPosts)
			setLoading(false)
		} else {
			loadPosts()
		}
	}, [externalPosts, loadPosts])

	const displayPosts = useMemo(() => {
		return posts.slice(0, limit)
	}, [posts, limit])

	if (loading) {
		return (
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
	}

	if (error) {
		return (
			<section className="py-12">
				<div className="text-center text-muted-foreground">
					<p>{error}</p>
				</div>
			</section>
		)
	}

	return (
		<section className="py-12">
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.6, delay: 0.2 }}
				className="space-y-8"
			>
				<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
					{displayPosts.map((post, index) => (
						<PostCard post={post} index={index} />
					))}
				</div>
			</motion.div>
		</section>
	)
}

export function LatestPostsContext() {
	const { latestPosts, loading, error } = useBlogData()

	if (loading) {
		return (
			<div className="space-y-4">
				<h2 className="text-xl font-bold text-gray-900 mb-4">Latest Posts</h2>
				{[...Array(3)].map((_, i) => (
					<div key={i} className="bg-white rounded-lg shadow p-4 animate-pulse">
						<div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
						<div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
						<div className="h-3 bg-gray-200 rounded w-full"></div>
					</div>
				))}
			</div>
		)
	}

	if (error) {
		return (
			<div className="bg-red-50 border border-red-200 rounded-lg p-4">
				<p className="text-red-600">Error loading latest posts: {error}</p>
			</div>
		)
	}

	return (
		<div>
			<h2 className="text-xl font-bold text-gray-900 mb-4">Latest Posts</h2>
			<div className="space-y-4">
				{latestPosts.map(post => (
					<article
						key={post.slug}
						className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow"
					>
						<div className="flex items-center justify-between mb-2">
							<time className="text-xs text-gray-500">
								{new Date(post.publishedAt).toLocaleDateString('en-US', {
									year: 'numeric',
									month: 'long',
									day: 'numeric'
								})}
							</time>
						</div>

						<h3 className="font-semibold text-gray-900 mb-2">
							<Link
								href={`/blog/${post.slug}`}
								className="hover:text-blue-600 transition-colors"
							>
								{post.title}
							</Link>
						</h3>

						<p className="text-sm text-gray-600 line-clamp-2">
							{post.excerpt}
						</p>
					</article>
				))}

				{latestPosts.length === 0 && (
					<p className="text-gray-500 text-center py-4">No posts available</p>
				)}
			</div>
		</div>
	)
}

export const LatestPosts = memo(LatestPostsComponent)
