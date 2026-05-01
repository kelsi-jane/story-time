import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

async function getStory(_request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  return { status: 501, jsonBody: { message: 'Not implemented' } };
}

async function updateStory(_request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  return { status: 501, jsonBody: { message: 'Not implemented' } };
}

async function deleteStory(_request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  return { status: 501, jsonBody: { message: 'Not implemented' } };
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
