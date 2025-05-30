import { useRouter } from 'next/router';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { markdownToHtml } from '@/lib/markdown';
import { generateArticleSEO, generateArticleJsonLd, generateBreadcrumbJsonLd } from '@/lib/seo';
import { SEOHead } from '@/components/seo-head';
import { generateExcerpt, generateSlug, calculateReadTime } from '@/lib/content-utils';

import { ArticleContent } from '@/components/article-content';
import { ArticleHeader } from '@/components/article-header';
import { Navigation } from '@/components/navigation';
import { Footer } from '@/components/footer';
import { Providers } from '@/components/providers';
import { PerformanceMonitor } from '@/components/performance-monitor';
import Link from 'next/link';


export default function ArticlePage({ post }) {
  const router = useRouter();
  
  if (router.isFallback) {
    return (
      <Providers>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading article...</p>
          </div>
        </div>
      </Providers>
    );
  }
  
  if (!post) {
    return (
      <Providers>
        <div className="min-h-screen flex flex-col">
          <Navigation />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-4">Article not found</h1>
              <p className="text-muted-foreground mb-6">The article you're looking for doesn't exist.</p>
              <Link href="/articles" className="text-primary hover:underline">
                ← Volver a la lista de artículos
              </Link>
            </div>
          </main>
          <Footer />
        </div>
      </Providers>
    );
  }

  // Generate SEO data
  const seoData = generateArticleSEO(post);
  const articleJsonLd = generateArticleJsonLd(post);
  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: 'Inicio', url: '/' },
    { name: 'Artículos', url: '/articles' },
    { name: post.title, url: `/articles/${post.slug}` }
  ]);

  const { title, content, author, publishedAt, tags, emoji, readTime } = post;

  return (
    <Providers>
      <PerformanceMonitor />
      <SEOHead 
        {...seoData}
        jsonLd={[articleJsonLd, breadcrumbJsonLd]}
      />
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1">
          {/* Optimized Hero Section */}
          <ArticleHeader post={post} />

          {/* Article Content */}
          <section className="container mx-auto max-w-4xl px-4 py-8">
            <div className="max-w-3xl mx-auto">
              <ArticleContent html={content} />
            </div>
          </section>

          {/* Back to top button */}
          <div className="container mx-auto max-w-4xl px-4 py-8">
            <div className="text-center">
              <Link
                href="#"
                className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
              >
                Back to top
              </Link>
            </div>
          </div>

        </main>
        <Footer />
      </div>
    </Providers>
  );
}

export async function getStaticPaths() {
  const postsDir = path.join(process.cwd(), 'blogposts');
  const filenames = fs.readdirSync(postsDir);

  const paths = filenames
    .filter((filename) => filename.endsWith('.md'))
    .map((filename) => ({
      params: { slug: filename.replace(/\.md$/, '') },
    }));

  return { paths, fallback: false }; // Changed from true for static export compatibility
}

export async function getStaticProps({ params }) {
  const postsDir = path.join(process.cwd(), 'blogposts');
  const filePath = path.join(postsDir, `${params.slug}.md`);

  let post = null;
  if (fs.existsSync(filePath)) {
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const { data, content } = matter(fileContents);
    
    // Validate mandatory author field
    if (!data.author) {
      console.error(`Missing mandatory 'author' field in frontmatter for file: ${params.slug}.md`);
      return {
        notFound: true,
      };
    }
    
    const processedContent = await markdownToHtml(content, params.slug);
    
    // Process author information directly from frontmatter
    let authorObj
    if (typeof data.author === 'string') {
      // Legacy format: just a name
      authorObj = {
        name: data.author,
        avatar: data.authorAvatar || 'https://github.com/surus.png',
        bio: data.authorBio || 'Contributor'
      }
    } else if (typeof data.author === 'object') {
      // New format: object with name, avatar, bio
      if (!data.author.name) {
        console.error(`Author object must have 'name' field in file: ${params.slug}.md`);
        return {
          notFound: true,
        };
      }
      authorObj = {
        name: data.author.name,
        avatar: data.author.avatar || 'https://github.com/surus.png',
        bio: data.author.bio || 'Contributor'
      }
    } else {
      console.error(`Author field must be a string or object in file: ${params.slug}.md`);
      return {
        notFound: true,
      };
    }
    
    post = {
      title: data.title || params.slug,
      content: processedContent,
      excerpt: data.excerpt || generateExcerpt(content),
      author: authorObj,
      publishedAt: data.publishedAt || data.date || new Date().toISOString(),
      updatedAt: data.updatedAt || null,
      tags: data.tags || [],
      slug: params.slug,
      emoji: data.emoji || '📝',
      coverImage: data.coverImage || '',
      readTime: data.readTime || calculateReadTime(content),
      featured: data.featured === true || data.featured === 'true',
    };
  }

  return {
    props: { post },
    notFound: !post,
  };
}