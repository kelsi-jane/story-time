import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

async function createChapter(_request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  return { status: 501, jsonBody: { message: 'Not implemented' } };
}

app.http('createChapter', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'chapters',
  handler: createChapter,
});
