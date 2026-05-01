import type { Story } from '../types';

const MOCK_STORIES: Story[] = [
  {
    id: '1',
    title: 'The Silver Thread',
    slug: 'the-silver-thread',
    description: 'In a village where dreams are woven into cloth, a girl discovers a single silver thread that connects her to a boy she\'s never met.',
    tags: ['fantasy', 'romance'],
    seriesSlug: undefined,
    seriesOrder: undefined,
    publishedAt: '2026-01-15T00:00:00Z',
    chapters: [
      {
        id: 'ch1',
        storyId: '1',
        title: 'The Loom at Dawn',
        order: 1,
        blobPath: '/content/the-silver-thread/chapter-1.md',
      },
    ],
  },
];

export async function getStories(): Promise<Story[]> {
  return MOCK_STORIES;
}

export async function getStory(slug: string): Promise<Story | null> {
  return MOCK_STORIES.find((s) => s.slug === slug) ?? null;
}

export async function getChapterContent(blobPath: string): Promise<string> {
  const res = await fetch(blobPath);
  if (!res.ok) throw new Error(`Failed to load chapter: ${res.status}`);
  return res.text();
}
