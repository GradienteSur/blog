export const seoConfig = {
  baseUrl: 'https://blog.gradientesur.com',
  siteName: 'GradienteSur Blog',
  defaultTitle: 'GradienteSur Blog - Inteligencia Artificial y Desarrollo Web',
  defaultDescription: 'Blog especializado en inteligencia artificial, deep learning, data science y tecnologías emergentes en latinoamérica. Tutoriales prácticos y análisis técnicos.',
  defaultKeywords: [
    'inteligencia artificial',
    'machine learning', 
    'AI en navegador',
    'deep learning',
    'data science',
    'open source',
    'blog',
    'tutoriales',
    'transformers.js',
    'hugging face',
    'next.js',
    'react',
    'tecnología',
    'gradientesur'
  ],
  author: {
    name: 'GradienteSur Team',
    url: 'https://gradientesur.com'
  },
  social: {
    twitter: '@gradientesur',
    github: 'https://github.com/gradientesur'
  },
  verification: {
    // Add these when available
    google: null,
    yandex: null,
    bing: null
  },
  locale: 'es_AR',
  type: 'website'
} as const

export const defaultSEO = {
  title: seoConfig.defaultTitle,
  description: seoConfig.defaultDescription,
  canonical: seoConfig.baseUrl,
  openGraph: {
    type: 'website',
    locale: seoConfig.locale,
    url: seoConfig.baseUrl,
    siteName: seoConfig.siteName,
    title: seoConfig.defaultTitle,
    description: seoConfig.defaultDescription,
    images: [
      {
        url: `${seoConfig.baseUrl}/logo.png`,
        width: 800,
        height: 600,
        alt: seoConfig.siteName
      }
    ]
  },
  twitter: {
    handle: seoConfig.social.twitter,
    site: seoConfig.social.twitter,
    cardType: 'summary_large_image'
  }
}
