import { pipeline, env, PipelineType } from '@xenova/transformers'

// Configure transformers.js
env.allowLocalModels = false
env.allowRemoteModels = true

class TransformersService {
  private models: Map<string, any> = new Map()
  
  async loadModel(task: PipelineType, model: string) {
    const key = `${task}-${model}`
    if (this.models.has(key)) {
      return this.models.get(key)
    }
    
    try {
      const pipe = await pipeline(task, model)
      this.models.set(key, pipe)
      return pipe
    } catch (error) {
      console.error(`Failed to load model ${model}:`, error)
      throw error
    }
  }
  
  async runSentimentAnalysis(text: string) {
    const classifier = await this.loadModel('sentiment-analysis', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english')
    return await classifier(text)
  }
  
  async runTextClassification(text: string, model: string = 'Xenova/distilbert-base-uncased-finetuned-sst-2-english') {
    const classifier = await this.loadModel('text-classification', model)
    return await classifier(text)
  }
  
  async runQuestionAnswering(question: string, context: string) {
    const qa = await this.loadModel('question-answering', 'Xenova/distilbert-base-cased-distilled-squad')
    return await qa(question, context)
  }
  
  async runTextGeneration(prompt: string, options: any = {}) {
    const generator = await this.loadModel('text-generation', 'Xenova/gpt2')
    return await generator(prompt, {
      max_length: 100,
      num_return_sequences: 1,
      ...options
    })
  }
  
  async runSummarization(text: string) {
    const summarizer = await this.loadModel('summarization', 'Xenova/distilbart-cnn-12-6')
    return await summarizer(text, {
      max_length: 100,
      min_length: 30,
    })
  }
  
  async runTranslation(text: string, model: string = 'Xenova/t5-small') {
    const translator = await this.loadModel('translation', model)
    return await translator(text)
  }
  
  async runFeatureExtraction(text: string) {
    const extractor = await this.loadModel('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
    return await extractor(text)
  }
  
  async runZeroShotClassification(text: string, labels: string[]) {
    const classifier = await this.loadModel('zero-shot-classification', 'Xenova/distilbert-base-uncased-mnli')
    return await classifier(text, labels)
  }
  
  // Generic runner for custom tasks
  async runCustomTask(task: PipelineType, model: string, input: any, options: any = {}) {
    try {
      const pipe = await this.loadModel(task, model)
      return await pipe(input, options)
    } catch (error) {
      console.error(`Error running custom task ${task} with model ${model}:`, error)
      throw error
    }
  }
  
  // Clear cache
  clearCache() {
    this.models.clear()
  }
  
  // Get loaded models
  getLoadedModels() {
    return Array.from(this.models.keys())
  }
}

export const transformersService = new TransformersService()

// Available models and tasks
export const AVAILABLE_MODELS = {
  'sentiment-analysis': [
    'Xenova/distilbert-base-uncased-finetuned-sst-2-english',
    'Xenova/cardiffnlp-twitter-roberta-base-sentiment-latest',
  ],
  'text-classification': [
    'Xenova/distilbert-base-uncased-finetuned-sst-2-english',
    'Xenova/toxic-bert',
  ],
  'question-answering': [
    'Xenova/distilbert-base-cased-distilled-squad',
    'Xenova/roberta-base-squad2',
  ],
  'text-generation': [
    'Xenova/gpt2',
    'Xenova/distilgpt2',
  ],
  'summarization': [
    'Xenova/distilbart-cnn-12-6',
    'Xenova/bart-large-cnn',
  ],
  'translation': [
    'Xenova/t5-small',
    'Xenova/opus-mt-en-de',
    'Xenova/opus-mt-en-fr',
  ],
  'feature-extraction': [
    'Xenova/all-MiniLM-L6-v2',
    'Xenova/all-mpnet-base-v2',
  ],
  'zero-shot-classification': [
    'Xenova/distilbert-base-uncased-mnli',
    'Xenova/bart-large-mnli',
  ],
}

export type TaskType = PipelineType
