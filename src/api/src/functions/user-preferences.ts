import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { BlobServiceClient } from '@azure/storage-blob';

function getContainerClient() {
  const connStr = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connStr) throw new Error('AZURE_STORAGE_CONNECTION_STRING not set');
  return BlobServiceClient.fromConnectionString(connStr).getContainerClient('user-data');
}

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

async function streamToString(stream: NodeJS.ReadableStream): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf-8');
}

const isDev = process.env.AZURE_FUNCTIONS_ENVIRONMENT === 'Development';

async function getUserPreferences(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const username = request.params.username;
  const caller = getCallerUsername(request);
  if (!isDev && (caller === null || caller !== username)) {
    return { status: 401, jsonBody: { message: 'Unauthorized' } };
  }
  try {
    const blob = getContainerClient().getBlobClient(`${username}/preferences.json`);
    const download = await blob.download();
    const text = await streamToString(download.readableStreamBody!);
    return { status: 200, body: text, headers: { 'Content-Type': 'application/json' } };
  } catch (err: any) {
    if (err.statusCode === 404) {
      return { status: 404, jsonBody: { message: 'No preferences stored' } };
    }
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
    const container = getContainerClient();
    await container.createIfNotExists();
    const blob = container.getBlockBlobClient(`${username}/preferences.json`);
    await blob.upload(body, Buffer.byteLength(body, 'utf-8'), {
      blobHTTPHeaders: { blobContentType: 'application/json' },
    });
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
