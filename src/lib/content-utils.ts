/**
 * Utility functions for processing blog post content
 */

/**
 * Generate a smart excerpt from markdown content
 * @param content - The markdown content
 * @param maxLength - Maximum length of the excerpt (default: 160)
 * @returns A clean excerpt without markdown syntax
 */
export function generateExcerpt(content: string, maxLength: number = 160): string {
  // Remove frontmatter if present
  const contentWithoutFrontmatter = content.replace(/^---[\s\S]*?---\s*/, '')
  
  // Remove markdown syntax
  let cleanContent = contentWithoutFrontmatter
    // Remove headers
    .replace(/^#{1,6}\s+.*$/gm, '')
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '')
    // Remove inline code
    .replace(/`[^`]*`/g, '')
    // Remove links but keep the text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove bold and italic
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    // Remove line breaks and extra spaces
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // Find the first meaningful sentence or paragraph
  const sentences = cleanContent.split(/[.!?]+/)
  let excerpt = ''
  
  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim()
    if (trimmedSentence.length > 20) { // Ignore very short sentences
      if (excerpt.length + trimmedSentence.length <= maxLength) {
        excerpt += (excerpt ? '. ' : '') + trimmedSentence
      } else {
        break
      }
    }
  }
  
  // If no good sentences found, fallback to first N characters
  if (!excerpt) {
    excerpt = cleanContent.substring(0, maxLength)
  }
  
  // Ensure it doesn't end mid-word and add ellipsis if truncated
  if (excerpt.length >= maxLength) {
    const lastSpace = excerpt.lastIndexOf(' ', maxLength - 3)
    excerpt = excerpt.substring(0, lastSpace > 0 ? lastSpace : maxLength - 3) + '...'
  }
  
  return excerpt
}

/**
 * Generate a slug from a title
 * @param title - The title to convert to slug
 * @returns A URL-friendly slug
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD') // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
}

/**
 * Calculate reading time based on content length
 * @param content - The content to analyze
 * @param wordsPerMinute - Average reading speed (default: 200)
 * @returns Reading time in minutes
 */
export function calculateReadTime(content: string, wordsPerMinute: number = 200): number {
  // Remove frontmatter and markdown syntax for more accurate word count
  const cleanContent = content
    .replace(/^---[\s\S]*?---\s*/, '') // Remove frontmatter
    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
    .replace(/`[^`]*`/g, '') // Remove inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links to text
    .replace(/[#*_`]/g, '') // Remove markdown formatting
  
  const wordCount = cleanContent.trim().split(/\s+/).length
  return Math.max(1, Math.ceil(wordCount / wordsPerMinute))
}
