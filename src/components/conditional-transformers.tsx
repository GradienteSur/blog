import { memo } from 'react'
import dynamic from 'next/dynamic'

// Lazy load transformers components only when needed
const TransformersDemo = dynamic(
  () => import('./transformers-demo').then(mod => mod.TransformersDemo),
  {
    loading: () => (
      <div className="animate-pulse bg-muted rounded-lg p-6">
        <div className="h-4 bg-muted-foreground/20 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-muted-foreground/20 rounded w-1/2"></div>
      </div>
    ),
    ssr: false, // Only load on client-side when actually needed
  }
)

interface ConditionalTransformersProps {
  shouldLoad: boolean
  children?: React.ReactNode
}

export const ConditionalTransformers = memo(({ shouldLoad, children }: ConditionalTransformersProps) => {
  if (!shouldLoad) {
    return <>{children}</>
  }
  
  return (
    <>
      {children}
      <TransformersDemo />
    </>
  )
})

ConditionalTransformers.displayName = 'ConditionalTransformers'
