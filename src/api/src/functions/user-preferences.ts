import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getBlobStore } from '../lib/storage';

function getCallerUsername(request: HttpRequest): string | null {
  const header = request.headers.get('x-ms-client-principal');
  if (!header) return null;
  try {
    const decoded = JSON.parse(Buffer.from(header, 'base64').toString('utf-8'));
    return decoded.userDetails ?? null;
  } catch {
    return null;
  }
}

const isDev = process.env.AZURE_FUNCTIONS_ENVIRONMENT === 'Development';

async function getUserPreferences(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const username = request.params.username;
  const caller = getCallerUsername(request);
  if (!isDev && (caller === null || caller !== username)) {
    return { status: 401, jsonBody: { message: 'Unauthorized' } };
  }
  try {
    const result = await getBlobStore().read('user-data', `${username}/preferences.json`);
    if (!result) {
      return { status: 404, jsonBody: { message: 'No preferences stored' } };
    }
    return { status: 200, body: result.content, headers: { 'Content-Type': 'application/json' } };
  } catch (err: any) {
    context.error('getUserPreferences error:', err);
    return { status: 500, jsonBody: { message: 'Failed to load preferences' } };
  }
}

async function putUserPreferences(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const username = request.params.username;
  const caller = getCallerUsername(request);
  if (!isDev && (caller === null || caller !== username)) {
    return { status: 401, jsonBody: { message: 'Unauthorized' } };
  }
  try {
    const body = await request.text();
    await getBlobStore().write('user-data', `${username}/preferences.json`, body, 'application/json');
    return { status: 200, jsonBody: { ok: true } };
  } catch (err: any) {
    context.error('putUserPreferences error:', err);
    return { status: 500, jsonBody: { message: 'Failed to save preferences' } };
  }
}

app.http('getUserPreferences', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'users/{username}/preferences',
  handler: getUserPreferences,
});

app.http('putUserPreferences', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'users/{username}/preferences',
  handler: putUserPreferences,
});
