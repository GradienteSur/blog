'use client'

import { useState, memo } from 'react'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { lazyTransformersService } from '@/lib/transformers-lazy'

interface TransformersDemoProps {}

export const TransformersDemo = memo(({ }: TransformersDemoProps) => {
  const [text, setText] = useState('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const analyzeSentiment = async () => {
    if (!text.trim()) return
    
    setLoading(true)
    setError(null)
    
    try {
      const analysis = await lazyTransformersService.runSentimentAnalysis(text)
      setResult(analysis)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze sentiment')
      console.error('Sentiment analysis error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="p-6 mt-8">
      <h3 className="text-lg font-semibold mb-4">Sentiment Analysis Demo</h3>
      
      <div className="space-y-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter text to analyze sentiment..."
          className="w-full p-3 border rounded-md resize-none"
          rows={3}
          disabled={loading}
        />
        
        <Button 
          onClick={analyzeSentiment}
          disabled={loading || !text.trim()}
          className="w-full"
        >
          {loading ? 'Analyzing...' : 'Analyze Sentiment'}
        </Button>
        
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
            Error: {error}
          </div>
        )}
        
        {result && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
            <div className="font-medium">Result:</div>
            <div className="mt-1">
              <span className="capitalize">{result[0]?.label}</span> 
              {result[0]?.score && (
                <span className="ml-2 text-sm text-gray-600">
                  ({(result[0].score * 100).toFixed(1)}% confidence)
                </span>
              )}
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-4 text-xs text-gray-500">
        This demo uses Transformers.js for client-side AI processing.
      </div>
    </Card>
  )
})

TransformersDemo.displayName = 'TransformersDemo'
