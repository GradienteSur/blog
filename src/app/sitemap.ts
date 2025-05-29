import { MetadataRoute } from 'next'
import { fetchBlogPosts } from '@/lib/github'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://blog.gradientesur.com'
  
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/articles`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
  ]

  // Dynamic blog posts - this will use/populate cache
  try {
    console.log('Fetching blog posts for sitemap (will cache results)...')
    const posts = await fetchBlogPosts()
    
    const blogPosts: MetadataRoute.Sitemap = posts.map((post) => ({
      url: `${baseUrl}/articles/${post.slug}`,
      lastModified: new Date(post.updatedAt || post.publishedAt),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }))

    console.log(`Generated sitemap with ${blogPosts.length} blog posts`)
    return [...staticPages, ...blogPosts]
  } catch (error) {
    console.error('Error generating sitemap:', error)
    return staticPages
  }
}

export const dynamic = 'force-static';