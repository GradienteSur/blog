// Predefined authors for the blog
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

export function getAuthor(authorInput: string | { name: string; avatar: string; bio?: string }) {
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
