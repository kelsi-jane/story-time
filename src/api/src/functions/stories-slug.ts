import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getTableClient, isAdmin } from '../lib/table-client';
import { getChaptersForStory } from './stories';

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

async function getStory(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const slug = request.params.slug;
  try {
    const entity = await getTableClient('Stories').getEntity<Record<string, unknown>>('story', slug);
    const chapters = await getChaptersForStory(slug);
    return { status: 200, jsonBody: entityToStory(entity, chapters) };
  } catch (err: unknown) {
    if ((err as { statusCode?: number }).statusCode === 404) {
      return { status: 404, jsonBody: { message: 'Story not found' } };
    }
    context.error('getStory error:', err);
    return { status: 500, jsonBody: { message: 'Failed to load story' } };
  }
}

async function updateStory(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  if (!isAdmin(request)) return { status: 401, jsonBody: { message: 'Unauthorized' } };
  const slug = request.params.slug;
  try {
    const data = await request.json() as Partial<Story>;
    const client = getTableClient('Stories');
    const existing = await client.getEntity<Record<string, unknown>>('story', slug);
    const updated = {
      partitionKey: 'story',
      rowKey: slug,
      id: existing.id,
      title: data.title ?? existing.title,
      subtitle: data.subtitle ?? existing.subtitle ?? '',
      description: data.description ?? existing.description ?? '',
      tags: data.tags !== undefined ? JSON.stringify(data.tags) : (existing.tags ?? '[]'),
      seriesSlug: data.seriesSlug ?? existing.seriesSlug ?? '',
      seriesOrder: data.seriesOrder ?? existing.seriesOrder ?? 0,
      authorUsername: data.authorUsername ?? existing.authorUsername ?? '',
      publishedAt: data.publishedAt !== undefined ? (data.publishedAt ?? '') : (existing.publishedAt ?? ''),
      coverImageUrl: data.coverImageUrl ?? existing.coverImageUrl ?? '',
    };
    await client.updateEntity(updated, 'Replace');
    const chapters = await getChaptersForStory(slug);
    return { status: 200, jsonBody: entityToStory(updated, chapters) };
  } catch (err: unknown) {
    if ((err as { statusCode?: number }).statusCode === 404) {
      return { status: 404, jsonBody: { message: 'Story not found' } };
    }
    context.error('updateStory error:', err);
    return { status: 500, jsonBody: { message: 'Failed to update story' } };
  }
}

async function deleteStory(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  if (!isAdmin(request)) return { status: 401, jsonBody: { message: 'Unauthorized' } };
  const slug = request.params.slug;
  try {
    const storiesClient = getTableClient('Stories');
    const chaptersClient = getTableClient('Chapters');

    // Delete all chapter entities for this story
    const chapters: { rowKey: string }[] = [];
    for await (const entity of chaptersClient.listEntities<Record<string, unknown>>({
      queryOptions: { filter: `PartitionKey eq '${slug}'` },
    })) {
      chapters.push({ rowKey: entity.rowKey as string });
    }
    for (const ch of chapters) {
      await chaptersClient.deleteEntity(slug, ch.rowKey);
    }

    await storiesClient.deleteEntity('story', slug);
    return { status: 200, jsonBody: { ok: true } };
  } catch (err: unknown) {
    if ((err as { statusCode?: number }).statusCode === 404) {
      return { status: 404, jsonBody: { message: 'Story not found' } };
    }
    context.error('deleteStory error:', err);
    return { status: 500, jsonBody: { message: 'Failed to delete story' } };
  }
}

app.http('getStory', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'stories/{slug}',
  handler: getStory,
});

app.http('updateStory', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'stories/{slug}',
  handler: updateStory,
});

app.http('deleteStory', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'stories/{slug}',
  handler: deleteStory,
});
