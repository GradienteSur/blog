import matter from 'gray-matter'
import { generateExcerpt, generateSlug, calculateReadTime } from './content-utils'
import { getAuthor } from './authors'
import type { BlogPost } from '@/types'
import { blogCache } from './cache'

interface GitHubFile {
  name: string
  download_url: string
  sha: string
}

interface GitHubAPIResponse {
  data: any
  etag?: string
  rateLimit: {
    remaining: number
    resetTime: number
  }
}

class GitHubAPIClient {
  private baseUrl = 'https://api.github.com'
  private owner = process.env.GITHUB_REPO_OWNER || 'gradientesur'
  private repo = process.env.GITHUB_REPO_NAME || 'blog'
  private branch = process.env.GITHUB_BRANCH || 'main'
  private postsPath = process.env.GITHUB_POSTS_PATH || 'blogposts'
  private authToken = process.env.GITHUB_TOKEN

  private async makeRequest(url: string, etag?: string): Promise<GitHubAPIResponse> {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'GradienteSur-Blog/1.0'
    }

    if (this.authToken) {
      headers['Authorization'] = `token ${this.authToken}`
    }

    if (etag) {
      headers['If-None-Match'] = etag
    }

    try {
      // Add cache key for better performance tracking
      const cacheKey = `api_${url}`
      
      const response = await fetch(url, { 
        headers,
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(10000)
      })

      // Handle rate limiting
      const remaining = parseInt(response.headers.get('x-ratelimit-remaining') || '0')
      const resetTime = parseInt(response.headers.get('x-ratelimit-reset') || '0') * 1000

      console.log(`GitHub API rate limit: ${remaining} requests remaining`)

      if (response.status === 304) {
        // Not modified, can use cached version
        return {
          data: null,
          etag,
          rateLimit: { remaining, resetTime }
        }
      }

      if (response.status === 403 && remaining === 0) {
        const waitTime = Math.max(resetTime - Date.now(), 0)
        throw new Error(`GitHub API rate limit exceeded. Reset in ${Math.ceil(waitTime / 1000 / 60)} minutes`)
      }

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      const responseEtag = response.headers.get('etag') || undefined

      return {
        data,
        etag: responseEtag,
        rateLimit: { remaining, resetTime }
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error('GitHub API request failed:', error.message)
        throw error
      }
      throw new Error('Unknown GitHub API error')
    }
  }

  private async fetchFileList(): Promise<GitHubFile[]> {
    const cacheKey = 'github-file-list'
    const cached = await blogCache.get<GitHubFile[]>(cacheKey)
    
    try {
      const url = `${this.baseUrl}/repos/${this.owner}/${this.repo}/contents/${this.postsPath}?ref=${this.branch}`
      
      // Add debugging
      console.log('GitHub API URL:', url)
      console.log('Owner:', this.owner)
      console.log('Repo:', this.repo)
      console.log('Auth token present:', !!this.authToken)
      
      const response = await this.makeRequest(url, cached?.etag)

      // If not modified, return cached data
      if (response.data === null && cached) {
        console.log('Using cached file list (not modified)')
        return cached.data
      }

      const files = response.data
        .filter((file: any) => file.type === 'file' && file.name.endsWith('.md'))
        .map((file: any): GitHubFile => ({
          name: file.name,
          download_url: file.download_url,
          sha: file.sha
        }))

      // Cache the file list
      await blogCache.set(cacheKey, files, response.etag)
      
      return files
    } catch (error) {
      console.error('GitHub API Error Details:', {
        owner: this.owner,
        repo: this.repo,
        postsPath: this.postsPath,
        url: `${this.baseUrl}/repos/${this.owner}/${this.repo}/contents/${this.postsPath}?ref=${this.branch}`
      })

      // If API fails, try to use cached data even if stale
      if (cached) {
        console.warn('GitHub API failed, using stale cached file list:', error)
        return cached.data
      }
      throw error
    }
  }

  private async fetchFileContent(file: GitHubFile): Promise<string> {
    const cacheKey = `github-file-${file.sha}`
    const cached = await blogCache.get<string>(cacheKey)

    // For file content, we can use SHA-based caching
    // If we have content for this SHA, it's definitely current
    if (cached) {
      return cached.data
    }

    try {
      const response = await fetch(file.download_url)
      if (!response.ok) {
        throw new Error(`Failed to fetch file ${file.name}: ${response.statusText}`)
      }

      const content = await response.text()
      
      // Cache indefinitely based on SHA (content won't change for same SHA)
      await blogCache.set(cacheKey, content)
      
      return content
    } catch (error) {
      console.error(`Failed to fetch content for ${file.name}:`, error)
      throw error
    }
  }

  async fetchBlogPosts(): Promise<BlogPost[]> {
    const cacheKey = 'processed-blog-posts'
    
    try {
      // Get the file list (cached)
      const files = await this.fetchFileList()
      
      // Create a cache key based on all file SHAs
      const filesShaKey = `files-sha-${files.map(f => f.sha).sort().join('-')}`
      const cachedPosts = await blogCache.get<BlogPost[]>(filesShaKey)
      
      if (cachedPosts) {
        console.log('Using cached processed blog posts')
        return cachedPosts.data
      }

      console.log(`Processing ${files.length} blog post files...`)
      
      // Fetch and process files with error handling
      const results = await Promise.allSettled(
        files.map(async (file): Promise<BlogPost> => {
          try {
            const content = await this.fetchFileContent(file)
            const { data: frontmatter, content: markdownContent } = matter(content)
            
            const slug = generateSlug(frontmatter.title || file.name.replace('.md', ''))
            const author = getAuthor(frontmatter.author || 'marian')
            
            return {
              id: file.sha,
              title: frontmatter.title || file.name.replace('.md', ''),
              slug,
              excerpt: frontmatter.excerpt || generateExcerpt(markdownContent),
              content: markdownContent,
              author,
              publishedAt: frontmatter.publishedAt || frontmatter.date || new Date().toISOString(),
              updatedAt: frontmatter.updatedAt || null,
              tags: Array.isArray(frontmatter.tags) ? frontmatter.tags : [],
              emoji: frontmatter.emoji || '📝',
              featured: frontmatter.featured === true || frontmatter.featured === 'true',
              readTime: frontmatter.readTime || calculateReadTime(markdownContent),
              coverImage: frontmatter.coverImage || ''
            }
          } catch (error) {
            console.error(`Failed to process file ${file.name}:`, error)
            throw error
          }
        })
      )

      // Extract successful results and log failures
      const posts: BlogPost[] = []
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          posts.push(result.value)
        } else {
          console.error(`Failed to process ${files[index].name}:`, result.reason)
        }
      })

      // Sort posts by publication date (newest first)
      posts.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      
      // Cache the processed posts
      await blogCache.set(filesShaKey, posts)
      
      console.log(`Successfully processed ${posts.length} blog posts`)
      return posts
      
    } catch (error) {
      console.error('Failed to fetch blog posts:', error)
      
      // Try to return any cached posts as fallback
      const fallbackCache = await blogCache.get<BlogPost[]>(cacheKey)
      if (fallbackCache) {
        console.warn('Using fallback cached blog posts due to API error')
        return fallbackCache.data
      }
      
      throw error
    }
  }

  async invalidateCache() {
    await blogCache.clear()
  }

  getCacheStats() {
    return blogCache.getStats()
  }
}

export const githubClient = new GitHubAPIClient()
export const fetchBlogPosts = () => githubClient.fetchBlogPosts()
