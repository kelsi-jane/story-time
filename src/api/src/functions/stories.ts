import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { isAdmin } from '../lib/table-client';
import { getDocumentStore } from '../lib/storage';

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
  slug: string;
  subtitle?: string;
  description?: string;
  tags: string[];
  seriesSlug?: string;
  seriesOrder?: number;
  authorUsername?: string;
  publishedAt: string | null;
  coverImageUrl?: string;
  chapters: Chapter[];
}

function entityToChapter(e: Record<string, unknown>): Chapter {
  return {
    id: e.rowKey as string,
    storyId: e.storyId as string,
    title: e.title as string,
    order: e.order as number,
    blobPath: e.blobPath as string,
  };
}

function entityToStory(e: Record<string, unknown>, chapters: Chapter[]): Story {
  return {
    id: e.id as string,
    title: e.title as string,
    slug: e.rowKey as string,
    subtitle: (e.subtitle as string) || undefined,
    description: (e.description as string) || undefined,
    tags: JSON.parse((e.tags as string) || '[]'),
    seriesSlug: (e.seriesSlug as string) || undefined,
    seriesOrder: (e.seriesOrder as number) || undefined,
    authorUsername: (e.authorUsername as string) || undefined,
    publishedAt: (e.publishedAt as string) || null,
    coverImageUrl: (e.coverImageUrl as string) || undefined,
    chapters,
  };
}

export async function getChaptersForStory(slug: string): Promise<Chapter[]> {
  const chapters: Chapter[] = [];
  for await (const entity of getDocumentStore().list<Record<string, unknown>>('Chapters', slug)) {
    chapters.push(entityToChapter(entity));
  }
  return chapters.sort((a, b) => a.order - b.order);
}

async function getStories(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const adminCaller = isAdmin(request);
    const stories: Story[] = [];
    for await (const entity of getDocumentStore().list<Record<string, unknown>>('Stories', 'story')) {
      if (!adminCaller && !(entity.publishedAt as string)) continue;
      const chapters = await getChaptersForStory(entity.rowKey as string);
      stories.push(entityToStory(entity, chapters));
    }
    return { status: 200, jsonBody: stories };
  } catch (err: unknown) {
    context.error('getStories error:', err);
    return { status: 500, jsonBody: { message: 'Failed to load stories' } };
  }
}

async function createStory(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  if (!isAdmin(request)) {
    return { status: 401, jsonBody: { message: 'Unauthorized' } };
  }
  try {
    const data = await request.json() as Partial<Story>;
    const id = crypto.randomUUID();
    const slug = data.slug!;
    const entity = {
      partitionKey: 'story',
      rowKey: slug,
      id,
      title: data.title ?? '',
      subtitle: data.subtitle ?? '',
      description: data.description ?? '',
      tags: JSON.stringify(data.tags ?? []),
      seriesSlug: data.seriesSlug ?? '',
      seriesOrder: data.seriesOrder ?? 0,
      authorUsername: data.authorUsername ?? '',
      publishedAt: data.publishedAt ?? '',
      coverImageUrl: data.coverImageUrl ?? '',
    };
    await getDocumentStore().create('Stories', entity);
    return { status: 201, jsonBody: entityToStory(entity, []) };
  } catch (err: unknown) {
    context.error('createStory error:', err);
    return { status: 500, jsonBody: { message: 'Failed to create story' } };
  }
}

app.http('getStories', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'stories',
  handler: getStories,
});

app.http('createStory', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'stories',
  handler: createStory,
});
