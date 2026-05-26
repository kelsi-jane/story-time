import { BlobServiceClient, BlockBlobClient } from '@azure/storage-blob';

// ── Types (mirrored from web/src/types.ts — keep in sync) ────────────────────

export type BlockColor = 'amber' | 'teal' | 'coral' | 'purple' | 'blue';
export type BlockStatus = 'active' | 'hidden' | 'parked' | 'archived';
export type SlotArea = 'board' | 'outline';

export interface Slot {
  id: string;
  label: string;
  area: SlotArea;
  order: number;
  hidden: boolean;
}

export interface Block {
  id: string;
  title: string;
  color: BlockColor;
  slot: string;
  boardSlot: string;
  tags: string[];
  notes?: string;
  pinned: boolean;
  status: BlockStatus;
  createdAt: string;
  updatedAt: string;
}

export interface OutlineAssignment {
  blockId: string;
  slotId: string;
}

export interface ProjectMeta {
  projectId: string;
  title: string;
  authorUsername: string;
  templateId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Projection {
  meta: ProjectMeta;
  slots: Slot[];
  blocks: Block[];
  outlineAssignments: OutlineAssignment[];
  eventCount: number;
}

export interface ProjectListItem {
  projectId: string;
  title: string;
  createdAt: string;
  blockCount: number;
}

export type WritingEvent =
  | { type: 'ProjectCreated'; payload: { title: string; authorUsername: string; templateId: string } }
  | { type: 'SlotAdded'; payload: { slotId: string; label: string; area: SlotArea; order: number } }
  | { type: 'BlockCreated'; payload: { blockId: string; title: string; color: BlockColor; slot: string } }
  | { type: 'BlockMoved'; payload: { blockId: string; fromSlot: string; toSlot: string } }
  | { type: 'BlockAssigned'; payload: { blockId: string; fromSlot: string; toSlot: string; referenced?: boolean } }
  | { type: 'BlockUnassigned'; payload: { blockId: string; fromSlot: string; toSlot: string } }
  | { type: 'BlockPinned'; payload: { blockId: string } }
  | { type: 'BlockUnpinned'; payload: { blockId: string } }
  | { type: 'BlockStatusChanged'; payload: { blockId: string; status: BlockStatus } }
  | { type: 'BlockUpdated'; payload: { blockId: string; title?: string; notes?: string; tags?: string[]; color?: BlockColor } }
  | { type: 'SlotReordered'; payload: { slotId: string; order: number } };

export type PersistedEvent = WritingEvent & {
  id: string;
  projectId: string;
  timestamp: string;
  userId: string;
  note?: string;
};

// ── Container ─────────────────────────────────────────────────────────────────

function getContainer() {
  const connStr = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connStr) throw new Error('AZURE_STORAGE_CONNECTION_STRING not set');
  return BlobServiceClient.fromConnectionString(connStr).getContainerClient('planning-data');
}

async function getBlob(path: string): Promise<BlockBlobClient> {
  const container = getContainer();
  await container.createIfNotExists();
  return container.getBlockBlobClient(path);
}

async function streamToString(stream: NodeJS.ReadableStream): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf-8');
}

// ── Event log ─────────────────────────────────────────────────────────────────

async function readEvents(projectId: string): Promise<{ events: PersistedEvent[]; etag: string | undefined }> {
  const blob = await getBlob(`projects/${projectId}/events.json`);
  try {
    const download = await blob.download();
    const etag = download.etag;
    const text = await streamToString(download.readableStreamBody!);
    return { events: JSON.parse(text) as PersistedEvent[], etag };
  } catch (err: any) {
    if (err.statusCode === 404) return { events: [], etag: undefined };
    throw err;
  }
}

export async function appendEvent(projectId: string, event: PersistedEvent): Promise<void> {
  const MAX_RETRIES = 3;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const { events, etag } = await readEvents(projectId);
    events.push(event);
    const body = JSON.stringify(events, null, 2);
    const blob = await getBlob(`projects/${projectId}/events.json`);
    try {
      await blob.upload(body, Buffer.byteLength(body, 'utf-8'), {
        blobHTTPHeaders: { blobContentType: 'application/json; charset=utf-8' },
        conditions: etag ? { ifMatch: etag } : { ifNoneMatch: '*' },
      });
      return;
    } catch (err: any) {
      if (err.statusCode === 412 && attempt < MAX_RETRIES - 1) continue;
      throw err;
    }
  }
}

// ── Snapshot ──────────────────────────────────────────────────────────────────

interface Snapshot {
  projection: Projection;
  eventCount: number;
}

async function readSnapshot(projectId: string): Promise<Snapshot | null> {
  try {
    const blob = await getBlob(`projects/${projectId}/snapshot.json`);
    const download = await blob.download();
    const text = await streamToString(download.readableStreamBody!);
    return JSON.parse(text) as Snapshot;
  } catch {
    return null;
  }
}

async function writeSnapshot(projectId: string, projection: Projection, eventCount: number): Promise<void> {
  try {
    const blob = await getBlob(`projects/${projectId}/snapshot.json`);
    const body = JSON.stringify({ projection, eventCount });
    await blob.upload(body, Buffer.byteLength(body, 'utf-8'), {
      blobHTTPHeaders: { blobContentType: 'application/json; charset=utf-8' },
      conditions: {},
    });
  } catch {
    // snapshot write failure is non-fatal — next request replays from events
  }
}

// ── Projection ────────────────────────────────────────────────────────────────

function projectEvents(events: PersistedEvent[], base?: Projection): Projection {
  let meta: ProjectMeta = base?.meta ?? {
    projectId: '', title: '', authorUsername: '', templateId: '',
    createdAt: '', updatedAt: '',
  };
  const slots: Slot[] = base ? JSON.parse(JSON.stringify(base.slots)) : [];
  const blocks: Block[] = base ? JSON.parse(JSON.stringify(base.blocks)) : [];
  const outlineAssignments: OutlineAssignment[] = base ? JSON.parse(JSON.stringify(base.outlineAssignments)) : [];

  for (const ev of events) {
    switch (ev.type) {
      case 'ProjectCreated':
        meta = {
          projectId: ev.projectId,
          title: ev.payload.title,
          authorUsername: ev.payload.authorUsername,
          templateId: ev.payload.templateId,
          createdAt: ev.timestamp,
          updatedAt: ev.timestamp,
        };
        break;

      case 'SlotAdded':
        slots.push({
          id: ev.payload.slotId,
          label: ev.payload.label,
          area: ev.payload.area,
          order: ev.payload.order,
          hidden: false,
        });
        break;

      case 'SlotReordered': {
        const target = slots.find(s => s.id === ev.payload.slotId);
        if (!target) break;
        const oldOrder = target.order;
        const newOrder = ev.payload.order;
        if (newOrder < oldOrder) {
          slots.forEach(s => { if (s.id !== target.id && s.order >= newOrder && s.order < oldOrder) s.order++; });
        } else {
          slots.forEach(s => { if (s.id !== target.id && s.order > oldOrder && s.order <= newOrder) s.order--; });
        }
        target.order = newOrder;
        break;
      }

      case 'BlockCreated':
        blocks.push({
          id: ev.payload.blockId,
          title: ev.payload.title,
          color: ev.payload.color,
          slot: ev.payload.slot,
          boardSlot: ev.payload.slot,
          tags: [],
          pinned: false,
          status: 'active',
          createdAt: ev.timestamp,
          updatedAt: ev.timestamp,
        });
        meta.updatedAt = ev.timestamp;
        break;

      case 'BlockMoved': {
        const block = blocks.find(b => b.id === ev.payload.blockId);
        if (block) { block.slot = ev.payload.toSlot; block.boardSlot = ev.payload.toSlot; block.updatedAt = ev.timestamp; }
        meta.updatedAt = ev.timestamp;
        break;
      }

      case 'BlockAssigned': {
        const block = blocks.find(b => b.id === ev.payload.blockId);
        if (block) {
          if (ev.payload.referenced) {
            const already = outlineAssignments.some(
              a => a.blockId === ev.payload.blockId && a.slotId === ev.payload.toSlot,
            );
            if (!already) outlineAssignments.push({ blockId: ev.payload.blockId, slotId: ev.payload.toSlot });
          } else {
            block.slot = ev.payload.toSlot;
          }
          block.updatedAt = ev.timestamp;
        }
        meta.updatedAt = ev.timestamp;
        break;
      }

      case 'BlockUnassigned': {
        const block = blocks.find(b => b.id === ev.payload.blockId);
        if (block) {
          const idx = outlineAssignments.findIndex(
            a => a.blockId === ev.payload.blockId && a.slotId === ev.payload.fromSlot,
          );
          if (idx !== -1) outlineAssignments.splice(idx, 1);
          block.slot = block.boardSlot;
          block.updatedAt = ev.timestamp;
        }
        meta.updatedAt = ev.timestamp;
        break;
      }

      case 'BlockPinned': {
        const block = blocks.find(b => b.id === ev.payload.blockId);
        if (block) { block.pinned = true; block.updatedAt = ev.timestamp; }
        meta.updatedAt = ev.timestamp;
        break;
      }

      case 'BlockUnpinned': {
        const block = blocks.find(b => b.id === ev.payload.blockId);
        if (block) { block.pinned = false; block.updatedAt = ev.timestamp; }
        meta.updatedAt = ev.timestamp;
        break;
      }

      case 'BlockStatusChanged': {
        const block = blocks.find(b => b.id === ev.payload.blockId);
        if (block) { block.status = ev.payload.status; block.updatedAt = ev.timestamp; }
        meta.updatedAt = ev.timestamp;
        break;
      }

      case 'BlockUpdated': {
        const block = blocks.find(b => b.id === ev.payload.blockId);
        if (block) {
          if (ev.payload.title !== undefined) block.title = ev.payload.title;
          if (ev.payload.notes !== undefined) block.notes = ev.payload.notes;
          if (ev.payload.tags !== undefined) block.tags = ev.payload.tags;
          if (ev.payload.color !== undefined) block.color = ev.payload.color;
          block.updatedAt = ev.timestamp;
        }
        meta.updatedAt = ev.timestamp;
        break;
      }
    }
  }

  slots.sort((a, b) => a.order - b.order);
  return { meta, slots, blocks, outlineAssignments, eventCount: events.length };
}

export async function replayEvents(projectId: string): Promise<Projection> {
  const [snapshot, { events }] = await Promise.all([
    readSnapshot(projectId),
    readEvents(projectId),
  ]);

  if (snapshot && snapshot.eventCount === events.length) {
    return snapshot.projection;
  }

  const base = snapshot && snapshot.eventCount < events.length ? snapshot.projection : undefined;
  const newEvents = base ? events.slice(snapshot!.eventCount) : events;
  const projection = projectEvents(newEvents, base);

  await writeSnapshot(projectId, projection, events.length);
  return projection;
}

// ── User index ────────────────────────────────────────────────────────────────

export async function getUserIndex(username: string): Promise<ProjectListItem[]> {
  const blob = await getBlob(`users/${username}/index.json`);
  try {
    const download = await blob.download();
    const text = await streamToString(download.readableStreamBody!);
    return JSON.parse(text) as ProjectListItem[];
  } catch (err: any) {
    if (err.statusCode === 404) return [];
    throw err;
  }
}

export async function updateUserIndex(
  username: string,
  updater: (items: ProjectListItem[]) => ProjectListItem[],
): Promise<void> {
  const MAX_RETRIES = 3;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const blob = await getBlob(`users/${username}/index.json`);
    let current: ProjectListItem[] = [];
    let etag: string | undefined;
    try {
      const download = await blob.download();
      etag = download.etag;
      current = JSON.parse(await streamToString(download.readableStreamBody!));
    } catch (err: any) {
      if (err.statusCode !== 404) throw err;
    }
    const updated = updater(current);
    const body = JSON.stringify(updated, null, 2);
    try {
      await blob.upload(body, Buffer.byteLength(body, 'utf-8'), {
        blobHTTPHeaders: { blobContentType: 'application/json; charset=utf-8' },
        conditions: etag ? { ifMatch: etag } : { ifNoneMatch: '*' },
      });
      return;
    } catch (err: any) {
      if (err.statusCode === 412 && attempt < MAX_RETRIES - 1) continue;
      throw err;
    }
  }
}
