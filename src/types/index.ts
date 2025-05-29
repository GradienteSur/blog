export interface PostMetadata {
  canonical?: string;
  description?: string;
  keywords?: string[];
  title?: string;
  image?: string; // Add image property
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  publishedAt: string;
  updatedAt?: string;
  emoji?: string;
  readTime: number;
  featured?: boolean;
  coverImage?: string;
  tags: string[];
  metadata?: PostMetadata;
  author: {
    name: string;
    avatar: string;
    bio?: string;
  };
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  parentId?: string;
  user: {
    id: string;
    name: string;
    avatar: string;
  };
  replies?: Comment[];
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar: string;
  bio?: string;
  role: 'admin' | 'writer' | 'reader';
  createdAt: string;
}