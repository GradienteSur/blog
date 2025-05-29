import Head from 'next/head'
import type { SEOData } from '@/lib/seo'

interface SEOHeadProps extends SEOData {
  jsonLd?: object | object[]
}

export function SEOHead({
  title,
  description,
  keywords = [],
  author,
  publishedTime,
  modifiedTime,
  image,
  url,
  type = 'website',
  jsonLd
}: SEOHeadProps) {
  const fullTitle = title.includes('GradienteSur') ? title : `${title} | GradienteSur Blog`
  
  return (
    <Head>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords.length > 0 && <meta name="keywords" content={keywords.join(', ')} />}
      {author && <meta name="author" content={author} />}
      
      {/* Canonical URL */}
      {url && <link rel="canonical" href={url} />}
      
      {/* Open Graph Tags */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:site_name" content="GradienteSur Blog" />
      <meta property="og:locale" content="es_AR" />
      {url && <meta property="og:url" content={url} />}
      {image && <meta property="og:image" content={image} />}
      {image && <meta property="og:image:alt" content={title} />}
      
      {/* Article specific Open Graph tags */}
      {type === 'article' && (
        <>
          {author && <meta property="article:author" content={author} />}
          {publishedTime && <meta property="article:published_time" content={publishedTime} />}
          {modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}
          {keywords.map((tag) => (
            <meta key={tag} property="article:tag" content={tag} />
          ))}
        </>
      )}
      
      {/* Twitter Card Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@gradientesur" />
      <meta name="twitter:creator" content="@gradientesur" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {image && <meta name="twitter:image" content={image} />}
      
      {/* Robots and Crawling */}
      <meta name="robots" content="index, follow, max-image-preview:large" />
      <meta name="googlebot" content="index, follow" />
      
      {/* JSON-LD Structured Data */}
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(Array.isArray(jsonLd) ? jsonLd : [jsonLd])
          }}
        />
      )}
    </Head>
  )
}
