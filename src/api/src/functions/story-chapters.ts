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

function entityToChapter(e: Record<string, unknown>): Chapter {
  return {
    id: e.rowKey as string,
    storyId: e.storyId as string,
    title: e.title as string,
    order: e.order as number,
    blobPath: e.blobPath as string,
  };
}

async function createChapter(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  if (!isAdmin(request)) return { status: 401, jsonBody: { message: 'Unauthorized' } };
  const slug = request.params.slug;
  try {
    const data = await request.json() as Partial<Chapter>;
    const entity = {
      partitionKey: slug,
      rowKey: data.id!,
      storyId: data.storyId ?? '',
      title: data.title ?? '',
      order: data.order ?? 0,
      blobPath: data.blobPath ?? '',
    };
    await getDocumentStore().create('Chapters', entity);
    return { status: 201, jsonBody: entityToChapter(entity) };
  } catch (err: unknown) {
    context.error('createChapter error:', err);
    return { status: 500, jsonBody: { message: 'Failed to create chapter' } };
  }
}

async function updateChapter(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  if (!isAdmin(request)) return { status: 401, jsonBody: { message: 'Unauthorized' } };
  const { slug, id } = request.params;
  try {
    const data = await request.json() as Partial<Chapter>;
    const store = getDocumentStore();
    const existing = await store.get<Record<string, unknown>>('Chapters', slug, id);
    const updated = {
      partitionKey: slug,
      rowKey: id,
      storyId: existing.storyId as string,
      title: data.title ?? (existing.title as string),
      order: data.order ?? (existing.order as number),
      blobPath: data.blobPath ?? (existing.blobPath as string),
    };
    await store.update('Chapters', updated, 'Replace');
    return { status: 200, jsonBody: entityToChapter(updated) };
  } catch (err: unknown) {
    if ((err as { statusCode?: number }).statusCode === 404) {
      return { status: 404, jsonBody: { message: 'Chapter not found' } };
    }
    context.error('updateChapter error:', err);
    return { status: 500, jsonBody: { message: 'Failed to update chapter' } };
  }
}

async function deleteChapter(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  if (!isAdmin(request)) return { status: 401, jsonBody: { message: 'Unauthorized' } };
  const { slug, id } = request.params;
  try {
    await getDocumentStore().delete('Chapters', slug, id);
    return { status: 200, jsonBody: { ok: true } };
  } catch (err: unknown) {
    if ((err as { statusCode?: number }).statusCode === 404) {
      return { status: 404, jsonBody: { message: 'Chapter not found' } };
    }
    context.error('deleteChapter error:', err);
    return { status: 500, jsonBody: { message: 'Failed to delete chapter' } };
  }
}

async function reorderChapters(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  if (!isAdmin(request)) return { status: 401, jsonBody: { message: 'Unauthorized' } };
  const slug = request.params.slug;
  try {
    const { orderedIds } = await request.json() as { orderedIds: string[] };
    const store = getDocumentStore();
    for (let i = 0; i < orderedIds.length; i++) {
      const id = orderedIds[i];
      const existing = await store.get<Record<string, unknown>>('Chapters', slug, id);
      await store.update(
        'Chapters',
        { ...existing, partitionKey: slug, rowKey: id, order: i + 1 },
        'Merge',
      );
    }
    return { status: 200, jsonBody: { ok: true } };
  } catch (err: unknown) {
    context.error('reorderChapters error:', err);
    return { status: 500, jsonBody: { message: 'Failed to reorder chapters' } };
  }
}

app.http('createStoryChapter', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'stories/{slug}/chapters',
  handler: createChapter,
});

app.http('updateStoryChapter', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'stories/{slug}/chapters/{id}',
  handler: updateChapter,
});

app.http('deleteStoryChapter', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'stories/{slug}/chapters/{id}',
  handler: deleteChapter,
});

app.http('reorderStoryChapters', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'stories/{slug}/chapters/order',
  handler: reorderChapters,
});
