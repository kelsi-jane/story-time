import { BlobServiceClient } from '@azure/storage-blob';
import { BlobReadResult, BlobStore, BlobWriteOptions } from './types';

async function streamToString(stream: NodeJS.ReadableStream): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf-8');
}

export class AzureBlobStore implements BlobStore {
  constructor(private connStr: string) {}

  private container(name: string) {
    return BlobServiceClient.fromConnectionString(this.connStr).getContainerClient(name);
  }

  async read(container: string, path: string): Promise<BlobReadResult | null> {
    const blob = this.container(container).getBlobClient(path);
    try {
      const download = await blob.download();
      const content = await streamToString(download.readableStreamBody!);
      return { content, etag: download.etag, lastModified: download.lastModified };
    } catch (err: any) {
      if (err.statusCode === 404) return null;
      throw err;
    }
  }

  async write(
    container: string,
    path: string,
    content: string,
    contentType: string,
    opts?: BlobWriteOptions,
  ): Promise<void> {
    const containerClient = this.container(container);
    await containerClient.createIfNotExists();
    const blob = containerClient.getBlockBlobClient(path);
    const conditions = opts?.ifMatch
      ? { ifMatch: opts.ifMatch }
      : opts?.ifNoneMatch
        ? { ifNoneMatch: opts.ifNoneMatch }
        : {};
    await blob.upload(content, Buffer.byteLength(content, 'utf-8'), {
      blobHTTPHeaders: { blobContentType: contentType },
      conditions,
    });
  }

  async delete(container: string, path: string): Promise<void> {
    try {
      await this.container(container).getBlockBlobClient(path).delete();
    } catch (err: any) {
      if (err.statusCode === 404) return;
      throw err;
    }
  }
}
