import { LatestPosts } from '@/components/latest-posts'
import { FeaturedPost } from '@/components/featured-post'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'surus blog - Inteligencia Artificial',
  description: 'Descubre los últimos avances en inteligencia artificial, machine learning y deep learning. Tutoriales prácticos, análisis técnico y tendencias tecnológicas.',
  keywords: ['inteligencia artificial', 'machine learning', 'AI en navegador', 'desarrollo web moderno', 'transformers', 'hugging face', 'next.js', 'react'],
  openGraph: {
    title: 'surus blog - Inteligencia Artificial',
    description: 'Descubre los últimos avances en inteligencia artificial, machine learning y deep learning.',
    url: 'https://blog.surus.dev',
    siteName: 'surus blog',
    locale: 'es_AR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'surus blog - Inteligencia Artificial',
    description: 'Descubre los últimos avances en inteligencia artificial, machine learning y deep learning.',
  },
  alternates: {
    canonical: 'https://blog.surus.dev'
  }
}

export default function HomePage() {
  return (
    <div className="space-y-12">
      <div className="container mx-auto px-4">
        <FeaturedPost />
        <LatestPosts />
      </div>
    </div>
  )
}
