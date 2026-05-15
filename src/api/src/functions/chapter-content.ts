import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { BlobServiceClient } from '@azure/storage-blob';

function getContainerClient() {
  const connStr = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connStr) throw new Error('AZURE_STORAGE_CONNECTION_STRING not set');
  return BlobServiceClient.fromConnectionString(connStr).getContainerClient('chapter-content');
}

async function streamToString(stream: NodeJS.ReadableStream): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf-8');
}

async function getChapterContent(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const id = request.params.id;
  try {
    const blob = getContainerClient().getBlobClient(`${id}.md`);
    const download = await blob.download();
    const text = await streamToString(download.readableStreamBody!);
    return {
      status: 200,
      body: text,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    };
  } catch (err: any) {
    if (err.statusCode === 404) {
      return { status: 404, jsonBody: { message: 'Chapter not found' } };
    }
    context.error('getChapterContent error:', err);
    return { status: 500, jsonBody: { message: 'Failed to load chapter' } };
  }
}

async function putChapterContent(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const id = request.params.id;
  try {
    const body = await request.text();
    const blob = getContainerClient().getBlockBlobClient(`${id}.md`);
    await blob.upload(body, Buffer.byteLength(body, 'utf-8'), {
      blobHTTPHeaders: { blobContentType: 'text/plain; charset=utf-8' },
    });
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