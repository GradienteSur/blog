import './globals.css'
import { Inter } from 'next/font/google'
import { Providers } from '@/components/providers'
import { Navigation } from '@/components/navigation'
import { Footer } from '@/components/footer'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  metadataBase: new URL('https://blog.gradientesur.com'),
  title: {
    default: 'GradienteSur Blog - Inteligencia Artificial ',
    template: '%s | GradienteSur Blog'
  },
  description: 'Blog especializado en inteligencia artificial, deep learning, data science y tecnologías emergentes en latinoamérica. Tutoriales prácticos y análisis técnicos.',
  keywords: ['inteligencia artificial', 'machine learning', 'deep learning', 'data science', 'open source', 'gradientesur', 'blog', 'tutoriales'],
  authors: [{ name: 'GradienteSur Team', url: 'https://gradientesur.com' }],
  creator: 'GradienteSur',
  publisher: 'GradienteSur',
  robots: 'index, follow',
  openGraph: {
    type: 'website',
    locale: 'es_AR',
    siteName: 'GradienteSur Blog',
    title: 'GradienteSur Blog - Inteligencia Artificial',
    description: 'Blog especializado en inteligencia artificial, deep learning, data science y tecnologías emergentes en latinoamérica. Tutoriales prácticos y análisis técnicos.',
    url: 'https://blog.gradientesur.com',
    images: [
      {
        url: '/logo.png',
        width: 800,
        height: 600,
        alt: 'GradienteSur Blog'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    site: '@gradientesur',
    creator: '@gradientesur',
    title: 'GradienteSur Blog - Inteligencia Artificial',
    description: 'Blog especializado en inteligencia artificial, deep learning, data science y tecnologías emergentes en latinoamérica. Tutoriales prácticos y análisis técnicos.',
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: 'https://blog.gradientesur.com'
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="canonical" href="https://blog.gradientesur.com" />
        <meta name="robots" content="index, follow, max-image-preview:large" />
        <meta name="googlebot" content="index, follow" />
        <link rel="icon" href="/logo.png" />
        <link rel="apple-touch-icon" href="/logo.png" />
        {/* Preload critical resources */}
        <link rel="preload" href="/logo.png" as="image" />
        <link rel="dns-prefetch" href="//github.com" />
        <link rel="dns-prefetch" href="//avatars.githubusercontent.com" />
        <link rel="dns-prefetch" href="//api.github.com" />
        {/* Verification meta tags (add when available) */}
        {/* <meta name="google-site-verification" content="your-verification-code" /> */}
      </head>
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen flex flex-col">
            <Navigation />
            <main className="flex-1">
              {children}
            </main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  )
}
