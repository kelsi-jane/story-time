import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getBlobStore } from '../lib/storage';

async function getChapterContent(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const id = request.params.id;
  try {
    const result = await getBlobStore().read('chapter-content', `${id}.md`);
    if (!result) {
      return { status: 404, jsonBody: { message: 'Chapter not found' } };
    }
    return {
      status: 200,
      body: result.content,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    };
  } catch (err: any) {
    context.error('getChapterContent error:', err);
    return { status: 500, jsonBody: { message: 'Failed to load chapter' } };
  }
}

async function putChapterContent(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const id = request.params.id;
  try {
    const body = await request.text();
    await getBlobStore().write('chapter-content', `${id}.md`, body, 'text/plain; charset=utf-8');
    return { status: 200, jsonBody: { ok: true } };
  } catch (err: any) {
    context.error('putChapterContent error:', err);
    return { status: 500, jsonBody: { message: 'Failed to save chapter' } };
  }
}

app.http('getChapterContent', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'chapters/{id}/content',
  handler: getChapterContent,
});

app.http('putChapterContent', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'chapters/{id}/content',
  handler: putChapterContent,
});