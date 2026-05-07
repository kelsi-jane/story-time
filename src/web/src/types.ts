export interface ReadingEvent {
  id: string;
  readerId: string;
  storyId: string;
  chapterId: string;
  storySlug: string;
  chapterOrder: number;
  occurredAt: string;
}

export interface AdminUser {
  id: string;
  username: string;  // GitHub username
  isPrimary: boolean;
  addedAt: string;
}

export interface Author {
  githubUsername: string;
  fullName: string;
  penName: string;
  bio?: string;
  profileImageUrl?: string;
}

export interface Chapter {
  id: string;
  storyId: string;
  title: string;
  order: number;
  blobPath: string;
}

export interface Story {
  id: string;
  title: string;
  slug: string;
  subtitle?: string;
  description?: string;
  coverImageUrl?: string;
  tags: string[];
  seriesSlug?: string;
  seriesOrder?: number;
  publishedAt: string | null;
  chapters: Chapter[];
  authorUsername?: string;
}

export interface Bookmark {
  id: string;
  readerId: string;
  storyId: string;
  chapterId: string;
  storySlug: string;
  chapterOrder: number;
  occurredAt: string;
}
