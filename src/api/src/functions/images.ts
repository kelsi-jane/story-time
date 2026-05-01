import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

async function uploadImage(_request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  return { status: 501, jsonBody: { message: 'Not implemented' } };
}

app.http('uploadImage', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'images',
  handler: uploadImage,
});
