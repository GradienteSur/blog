import { LatestPosts } from '@/components/latest-posts'
import { FeaturedPost } from '@/components/featured-post'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'GradienteSur Blog - Inteligencia Artificial',
  description: 'Descubre los últimos avances en inteligencia artificial, machine learning y deep learning. Tutoriales prácticos, análisis técnico y tendencias tecnológicas.',
  keywords: ['inteligencia artificial', 'machine learning', 'AI en navegador', 'desarrollo web moderno', 'transformers.js', 'hugging face', 'next.js', 'react'],
  openGraph: {
    title: 'GradienteSur Blog - Inteligencia Artificial',
    description: 'Descubre los últimos avances en inteligencia artificial, machine learning y deep learning.',
    url: 'https://blog.gradientesur.com',
    siteName: 'GradienteSur Blog',
    locale: 'es_AR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GradienteSur Blog - Inteligencia Artificial',
    description: 'Descubre los últimos avances en inteligencia artificial, machine learning y deep learning.',
  },
  alternates: {
    canonical: 'https://blog.gradientesur.com'
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
