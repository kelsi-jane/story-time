// Provider-agnostic storage interfaces. Shapes are derived from existing
// usage of @azure/data-tables and @azure/storage-blob across the API —
// see design/vendor-portability.md for the rationale.

export interface DocumentStore {
  list<T extends Record<string, unknown>>(
    table: string,
    partitionKey?: string,
  ): AsyncIterable<T & { partitionKey: string; rowKey: string }>;

  get<T extends Record<string, unknown>>(
    table: string,
    partitionKey: string,
    rowKey: string,
  ): Promise<T & { partitionKey: string; rowKey: string }>;

  create(
    table: string,
    entity: Record<string, unknown> & { partitionKey: string; rowKey: string },
  ): Promise<void>;

  update(
    table: string,
    entity: Record<string, unknown> & { partitionKey: string; rowKey: string },
    mode: 'Replace' | 'Merge',
  ): Promise<void>;

  delete(table: string, partitionKey: string, rowKey: string): Promise<void>;
}

export interface BlobReadResult {
  content: string;
  etag?: string;
  lastModified?: Date;
}

export interface BlobWriteOptions {
  ifMatch?: string;
  ifNoneMatch?: string;
}

export interface BlobStore {
  /** Returns null if the blob does not exist. */
  read(container: string, path: string): Promise<BlobReadResult | null>;

  write(
    container: string,
    path: string,
    content: string,
    contentType: string,
    opts?: BlobWriteOptions,
  ): Promise<void>;

  delete(container: string, path: string): Promise<void>;
}
