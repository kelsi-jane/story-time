/**
 * One-time seed script — upserts INITIAL_STORIES into Azure Table Storage.
 *
 * Usage:
 *   Local:  AZURE_STORAGE_CONNECTION_STRING="UseDevelopmentStorage=true" npx ts-node src/seed.ts
 *   Prod:   AZURE_STORAGE_CONNECTION_STRING="<real-connstr>"            npx ts-node src/seed.ts
 */

import { TableClient, TableServiceClient } from '@azure/data-tables';

const connStr = process.env.AZURE_STORAGE_CONNECTION_STRING;
if (!connStr) {
  console.error('AZURE_STORAGE_CONNECTION_STRING is not set');
  process.exit(1);
}

interface Chapter {
  id: string;
  storyId: string;
  title: string;
  order: number;
  blobPath: string;
}

interface Story {
  id: string;
  title: string;
  subtitle?: string;
  slug: string;
  description?: string;
  tags: string[];
  seriesSlug?: string;
  seriesOrder?: number;
  authorUsername?: string;
  publishedAt: string | null;
  coverImageUrl?: string;
  chapters: Chapter[];
}

const INITIAL_STORIES: Story[] = [
  {
    id: '1',
    title: 'The Silver Thread',
    slug: 'the-silver-thread',
    description: "In a village where dreams are woven into cloth, a girl discovers a single silver thread that connects her to a boy she's never met.",
    tags: ['fantasy', 'romance'],
    seriesSlug: 'the-silver-thread',
    seriesOrder: 1,
    authorUsername: 'kelsi-jane',
    publishedAt: '2026-01-15T00:00:00Z',
    coverImageUrl: 'https://www.wistful.me/assets/kelsi-jane/loom-sketch.jpeg',
    chapters: [
      { id: 'ch1-1', storyId: '1', title: 'The Loom at Dawn',         order: 1, blobPath: '/api/chapters/ch1-1/content' },
      { id: 'ch1-2', storyId: '1', title: 'The Thread Remembers',     order: 2, blobPath: '/api/chapters/ch1-2/content' },
      { id: 'ch1-3', storyId: '1', title: 'The Map in the Weave',     order: 3, blobPath: '/api/chapters/ch1-3/content' },
      { id: 'ch1-4', storyId: '1', title: "The Boy Who Didn't Know",  order: 4, blobPath: '/api/chapters/ch1-4/content' },
      { id: 'ch1-5', storyId: '1', title: 'What Is Bound',            order: 5, blobPath: '/api/chapters/ch1-5/content' },
    ],
  },
  {
    id: '2',
    title: 'The Silver Thread',
    subtitle: 'Wedding Bells',
    slug: 'the-silver-thread-wedding-bells',
    description: 'An invitation arrives on silver cloth, and Mara must travel north to witness a wedding that will change everything she thought she understood about the thread.',
    tags: ['fantasy', 'romance'],
    seriesSlug: 'the-silver-thread',
    seriesOrder: 2,
    authorUsername: 'kelsi-jane',
    publishedAt: '2026-03-01T00:00:00Z',
    coverImageUrl: 'https://www.wistful.me/assets/kelsi-jane/wedding-bells-sketch.png',
    chapters: [
      { id: 'ch2-1', storyId: '2', title: 'An Invitation Arrives', order: 1, blobPath: '/api/chapters/ch2-1/content' },
      { id: 'ch2-2', storyId: '2', title: 'Three Days North',      order: 2, blobPath: '/api/chapters/ch2-2/content' },
    ],
  },
];

async function ensureTable(serviceClient: TableServiceClient, name: string): Promise<void> {
  try {
    await serviceClient.createTable(name);
    console.log(`  Created table: ${name}`);
  } catch (err: unknown) {
    if ((err as { statusCode?: number }).statusCode === 409) {
      console.log(`  Table already exists: ${name}`);
    } else {
      throw err;
    }
  }
}

async function seed(): Promise<void> {
  const serviceClient = TableServiceClient.fromConnectionString(connStr!);
  await ensureTable(serviceClient, 'Stories');
  await ensureTable(serviceClient, 'Chapters');

  const storiesClient = TableClient.fromConnectionString(connStr!, 'Stories');
  const chaptersClient = TableClient.fromConnectionString(connStr!, 'Chapters');

  for (const story of INITIAL_STORIES) {
    const storyEntity = {
      partitionKey: 'story',
      rowKey: story.slug,
      id: story.id,
      title: story.title,
      subtitle: story.subtitle ?? '',
      description: story.description ?? '',
      tags: JSON.stringify(story.tags),
      seriesSlug: story.seriesSlug ?? '',
      seriesOrder: story.seriesOrder ?? 0,
      authorUsername: story.authorUsername ?? '',
      publishedAt: story.publishedAt ?? '',
      coverImageUrl: story.coverImageUrl ?? '',
    };
    await storiesClient.upsertEntity(storyEntity, 'Replace');
    console.log(`  Upserted story: ${story.slug}`);

    for (const ch of story.chapters) {
      const chapterEntity = {
        partitionKey: story.slug,
        rowKey: ch.id,
        storyId: ch.storyId,
        title: ch.title,
        order: ch.order,
        blobPath: ch.blobPath,
      };
      await chaptersClient.upsertEntity(chapterEntity, 'Replace');
      console.log(`    Upserted chapter: ${ch.id} — ${ch.title}`);
    }
  }

  console.log('\nSeed complete.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
