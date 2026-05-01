import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

async function getChapter(_request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  return { status: 501, jsonBody: { message: 'Not implemented' } };
}

async function updateChapter(_request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  return { status: 501, jsonBody: { message: 'Not implemented' } };
}

async function deleteChapter(_request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  return { status: 501, jsonBody: { message: 'Not implemented' } };
}

app.http('getChapter', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'chapters/{id}',
  handler: getChapter,
});

app.http('updateChapter', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'chapters/{id}',
  handler: updateChapter,
});

app.http('deleteChapter', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'chapters/{id}',
  handler: deleteChapter,
});
