import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import Link from 'next/link';
import { SEOHead } from '@/components/seo-head';
import { generateWebsiteJsonLd, generateBreadcrumbJsonLd } from '@/lib/seo';
import { generateExcerpt, generateSlug, calculateReadTime } from '@/lib/content-utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Calendar, Clock, ArrowRight } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { Navigation } from '@/components/navigation';
import { Footer } from '@/components/footer';
import { Providers } from '@/components/providers';
import { fetchBlogPosts } from '@/lib/github';
import { PerformanceMonitor } from '@/components/performance-monitor';

export default function ArticlesList({ posts }) {
  const seoData = {
    title: 'Artículos sobre IA y Desarrollo Web',
    description: 'Aprende sobre inteligencia artificial, deep learning, data science y tecnologías emergentes en latinoamérica. Tutoriales prácticos y análisis técnicos.',
    keywords: ['artículos IA', 'tutoriales machine learning', 'desarrollo web', 'inteligencia artificial', 'transformers', 'hugging face', 'open source', 'deep learning', 'data science', 'IA en español'],
    url: 'https://blog.gradientesur.com/articles',
    type: 'website'
  };

  const websiteJsonLd = generateWebsiteJsonLd();
  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: 'Inicio', url: '/' },
    { name: 'Artículos', url: '/articles' }
  ]);

  return (
    <Providers>
      <PerformanceMonitor />
      <SEOHead 
        {...seoData}
        jsonLd={[websiteJsonLd, breadcrumbJsonLd]}
      />
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1">
          <div className="container mx-auto px-4 py-12">
            {/* Header */}
            <div className="text-center mb-12">
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Explorá nuestros posteos de tutoriales, ideas y guías prácticas para aprender e implementar IA.
              </p>
            </div>

            {/* Articles Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
              {posts.map((post) => (
                <Card key={post.slug} className="group hover:shadow-lg transition-all duration-300 border-0 bg-card/50 backdrop-blur">
                  <Link href={`/articles/${post.slug}`}>
                    <div className="aspect-video overflow-hidden rounded-t-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <div className="text-center text-white">
                        <div className="text-6xl mb-2">{post.emoji || '📝'}</div>
                      </div>
                    </div>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                        {post.publishedAt && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{formatDate(post.publishedAt)}</span>
                          </div>
                        )}
                        {post.readTime && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{post.readTime} min read</span>
                          </div>
                        )}
                      </div>
                      <h2 className="text-xl font-semibold group-hover:text-primary transition-colors line-clamp-2">
                        {post.title}
                      </h2>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {post.excerpt && (
                        <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
                          {post.excerpt}
                        </p>
                      )}
                      {post.tags && post.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-4">
                          {post.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {post.tags.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{post.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                      <div className="flex items-center text-primary text-sm font-medium group-hover:text-primary/80 transition-colors">
                        Read article
                        <ArrowRight className="ml-1 h-3 w-3 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </CardContent>
                  </Link>
                </Card>
              ))}
            </div>

            {posts.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No se encontraron artículos.</p>
              </div>
            )}
          </div>
        </main>
        <Footer />
      </div>
    </Providers>
  );
}

export async function getStaticProps() {
  const posts = await fetchBlogPosts();

  // Transform the posts to match the expected structure
  const transformedPosts = posts.map((post) => ({
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    publishedAt: post.publishedAt,
    id: post.id,
    tags: post.tags,
    emoji: post.emoji,
    readTime: post.readTime,
  }));

  return {
    props: { posts: transformedPosts },
    // Note: revalidate removed for static export compatibility
  };
}
