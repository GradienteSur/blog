'use client'

import { memo } from 'react'
import { ThemeProvider } from 'next-themes'
import { Toaster } from '@/components/ui/toaster'
import { BlogDataProvider } from '@/contexts/blog-data-context'

interface ProvidersProps {
  children: React.ReactNode
}

export const Providers = memo(function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
    </ThemeProvider>
  )
})
