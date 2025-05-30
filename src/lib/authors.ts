/**
 * @deprecated This file is deprecated. Author information should now be included 
 * directly in the markdown frontmatter using the author field as an object:
 * 
 * author:
 *   name: 'Author Name'
 *   avatar: 'https://...'
 *   bio: 'Author bio'
 * 
 * This file is kept for backward compatibility only.
 */

// Predefined authors for the blog (DEPRECATED)
export const AUTHORS = {
  'marian': {
    name: 'Marian Basti',
    avatar: 'https://avatars.githubusercontent.com/u/31198560',
    bio: 'CTO de surus'
  },
  'surus': {
    name: 'surus Team',
    avatar: 'https://github.com/surus.png',
    bio: 'Tech enthusiasts'
  }
} as const

export type AuthorKey = keyof typeof AUTHORS

/**
 * @deprecated Use author object directly in markdown frontmatter instead
 */
export function getAuthor(authorInput: string | { name: string; avatar: string; bio?: string }) {
  console.warn('getAuthor is deprecated. Define author information directly in markdown frontmatter.')
  
  if (!authorInput) {
    throw new Error('Author field is mandatory and cannot be empty')
  }
  
  if (typeof authorInput === 'string') {
    const predefinedAuthor = AUTHORS[authorInput as AuthorKey]
    if (predefinedAuthor) {
      return predefinedAuthor
    }
    // If not found in predefined authors, treat as a name
    return {
      name: authorInput,
      avatar: 'https://github.com/surus.png',
      bio: 'Contributor'
    }
  }
  
  return authorInput
}

/**
 * @deprecated Use author object validation in processing logic instead
 */
export function validateAuthor(author: any): boolean {
  console.warn('validateAuthor is deprecated. Use inline validation in processing logic.')
  return !!(author && (typeof author === 'string' || (author.name && author.avatar)))
}
