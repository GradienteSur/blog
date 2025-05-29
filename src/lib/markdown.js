import { remark } from 'remark';
import remarkPrism from 'remark-prism';
import html from 'remark-html';
import remarkGfm from 'remark-gfm';

// Cache for processed markdown
const markdownCache = new Map();

/**
 * Process markdown content into HTML with syntax highlighting
 * @param {string} markdown - Raw markdown content
 * @param {string} cacheKey - Optional cache key for memoization
 * @returns {Promise<string>} - HTML string
 */
export async function markdownToHtml(markdown, cacheKey = null) {
  // Use cache if key provided
  if (cacheKey && markdownCache.has(cacheKey)) {
    return markdownCache.get(cacheKey);
  }

  const result = await remark()
    .use(remarkGfm)
    .use(html, { sanitize: false })
    .use(remarkPrism)
    .process(markdown);
  
  const htmlString = result.toString();

  // Cache the result if key provided
  if (cacheKey) {
    // Limit cache size to prevent memory issues
    if (markdownCache.size > 100) {
      const firstKey = markdownCache.keys().next().value;
      markdownCache.delete(firstKey);
    }
    markdownCache.set(cacheKey, htmlString);
  }

  return htmlString;
}
