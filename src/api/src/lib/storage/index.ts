import { AzureDocumentStore } from './azure-document-store';
import { AzureBlobStore } from './azure-blob-store';
import { BlobStore, DocumentStore } from './types';

export * from './types';

let documentStore: DocumentStore | undefined;
let blobStore: BlobStore | undefined;

function getConnectionString(): string {
  const connStr = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connStr) throw new Error('AZURE_STORAGE_CONNECTION_STRING not set');
  return connStr;
}

// STORAGE_PROVIDER is reserved for selecting non-Azure adapters in the future.
export function getDocumentStore(): DocumentStore {
  if (!documentStore) documentStore = new AzureDocumentStore(getConnectionString());
  return documentStore;
}

export function getBlobStore(): BlobStore {
  if (!blobStore) blobStore = new AzureBlobStore(getConnectionString());
  return blobStore;
}
