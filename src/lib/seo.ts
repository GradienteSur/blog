import type { BlogPost } from '@/types'

export interface SEOData {
  title: string
  description: string
  keywords?: string[]
  author?: string
  publishedTime?: string
  modifiedTime?: string
  tags?: string[]
  image?: string
  url?: string
  type?: 'website' | 'article'
}

export function generateArticleSEO(post: BlogPost, baseUrl: string = 'https://blog.surus.dev'): SEOData {
  const url = post.metadata?.canonical ?? `${baseUrl}/articles/${post.slug}`
  const description = post.metadata?.description ?? post.excerpt?.replace(/[<>]/g, '').trim() ?? ''
  const cleanDescription = description.length > 160 ? description.substring(0, 157) + '...' : description
  const keywords = post.metadata?.keywords ?? post.tags
  
  return {
    title: post.metadata?.title ?? post.title,
    description: cleanDescription,
    keywords: keywords,
    author: post.author.name,
    publishedTime: post.publishedAt,
    modifiedTime: post.updatedAt || post.publishedAt,
    tags: post.tags,
    image: post.metadata?.image || post.coverImage || '/logo.png',
    url,
    type: 'article'
  }
}

export function generateArticleJsonLd(post: BlogPost, baseUrl: string = 'https://blog.surus.dev') {
  const url = `${baseUrl}/articles/${post.slug}`
  
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt.replace(/[<>]/g, '').trim(),
    image: post.coverImage || `${baseUrl}/logo.png`,
    url,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt || post.publishedAt,
    author: {
      '@type': 'Person',
      name: post.author.name,
      image: post.author.avatar,
      description: post.author.bio
    },
    publisher: {
      '@type': 'Organization',
      name: 'surus',
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/logo.png`
      }
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url
    },
    keywords: post.tags.join(', '),
    wordCount: post.content.split(' ').length,
    timeRequired: `PT${post.readTime}M`,
    inLanguage: 'es-AR',
    isPartOf: {
      '@type': 'Website',
      name: 'surus blog',
      url: baseUrl
    }
  }
}

export function generateBreadcrumbJsonLd(items: Array<{ name: string; url: string }>, baseUrl: string = 'https://blog.surus.dev') {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${baseUrl}${item.url}`
    }))
  }
}

export function generateWebsiteJsonLd(baseUrl: string = 'https://blog.surus.dev') {
  return {
    '@context': 'https://schema.org',
    '@type': 'Website',
    name: 'surus blog',
    description: 'Blog especializado en inteligencia artificial, machine learning en el navegador y desarrollo web moderno.',
    url: baseUrl,
    inLanguage: 'es-AR',
    publisher: {
      '@type': 'Organization',
      name: 'surus',
      url: 'https://surus.dev',
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/logo.png`
      }
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: `${baseUrl}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string'
    }
  }
}
