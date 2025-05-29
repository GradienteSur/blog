/**
 * Lazy-loaded transformers service with dynamic imports
 */

// Only import types, not the actual library
export type TransformersTask = 'sentiment-analysis' | 'text-classification' | 'question-answering' | 'text-generation' | 'summarization'

class LazyTransformersService {
  private loadPromise: Promise<any> | null = null
  private models: Map<string, any> = new Map()

  private async loadTransformers() {
    if (!this.loadPromise) {
      this.loadPromise = import('@xenova/transformers').then(module => module)
    }
    return this.loadPromise
  }

  async runSentimentAnalysis(text: string) {
    const { pipeline } = await this.loadTransformers()
    const key = 'sentiment-analysis'
    
    if (!this.models.has(key)) {
      const classifier = await pipeline('sentiment-analysis', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english')
      this.models.set(key, classifier)
    }
    
    return await this.models.get(key)(text)
  }

  async runTextClassification(text: string, model: string = 'Xenova/distilbert-base-uncased-finetuned-sst-2-english') {
    const { pipeline } = await this.loadTransformers()
    const key = `text-classification-${model}`
    
    if (!this.models.has(key)) {
      const classifier = await pipeline('text-classification', model)
      this.models.set(key, classifier)
    }
    
    return await this.models.get(key)(text)
  }

  // Add other methods as needed
  clearCache() {
    this.models.clear()
  }
}

export const lazyTransformersService = new LazyTransformersService()
