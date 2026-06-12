import { TableClient, TableEntity } from '@azure/data-tables';
import { DocumentStore } from './types';

export class AzureDocumentStore implements DocumentStore {
  constructor(private connStr: string) {}

  private client(table: string): TableClient {
    return TableClient.fromConnectionString(this.connStr, table);
  }

  async *list<T extends Record<string, unknown>>(
    table: string,
    partitionKey?: string,
  ): AsyncIterable<T & { partitionKey: string; rowKey: string }> {
    const queryOptions = partitionKey ? { filter: `PartitionKey eq '${partitionKey}'` } : undefined;
    for await (const entity of this.client(table).listEntities<Record<string, unknown>>({ queryOptions })) {
      yield entity as unknown as T & { partitionKey: string; rowKey: string };
    }
  }

  async get<T extends Record<string, unknown>>(
    table: string,
    partitionKey: string,
    rowKey: string,
  ): Promise<T & { partitionKey: string; rowKey: string }> {
    const entity = await this.client(table).getEntity<Record<string, unknown>>(partitionKey, rowKey);
    return entity as unknown as T & { partitionKey: string; rowKey: string };
  }

  async create(
    table: string,
    entity: Record<string, unknown> & { partitionKey: string; rowKey: string },
  ): Promise<void> {
    await this.client(table).createEntity(entity as TableEntity<Record<string, unknown>>);
  }

  async update(
    table: string,
    entity: Record<string, unknown> & { partitionKey: string; rowKey: string },
    mode: 'Replace' | 'Merge',
  ): Promise<void> {
    await this.client(table).updateEntity(entity as TableEntity<Record<string, unknown>>, mode);
  }

  async delete(table: string, partitionKey: string, rowKey: string): Promise<void> {
    await this.client(table).deleteEntity(partitionKey, rowKey);
  }
}
