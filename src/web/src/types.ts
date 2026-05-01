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
  description?: string;
  tags: string[];
  seriesSlug?: string;
  seriesOrder?: number;
  publishedAt: string | null;
  chapters: Chapter[];
}
