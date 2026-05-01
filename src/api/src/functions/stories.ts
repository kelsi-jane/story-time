import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

async function getStories(_request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  return { status: 200, jsonBody: [] };
}

async function createStory(_request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  return { status: 501, jsonBody: { message: 'Not implemented' } };
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
