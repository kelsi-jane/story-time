/**
 * Dev sync script — bidirectional sync of planning events between local Azurite and production Azure Blob.
 *
 * Usage:
 *   # Dry run (shows diff, writes nothing)
 *   LOCAL_CONN="UseDevelopmentStorage=true" PROD_CONN="<real-connstr>" \
 *     npx ts-node src/sync.ts --project proj_abc123
 *
 *   # Pull prod-only events down to local
 *     ... npx ts-node src/sync.ts --project proj_abc123 --pull
 *
 *   # Push local-only events up to prod
 *     ... npx ts-node src/sync.ts --project proj_abc123 --push
 *
 *   # Both directions
 *     ... npx ts-node src/sync.ts --project proj_abc123 --pull --push
 *
 * After writing events to a side, also ensures the project appears in that
 * owner's project list (users/{authorUsername}/index.json) — derived from
 * the synced events' ProjectCreated entry.
 */

import { BlobServiceClient, BlockBlobClient } from '@azure/storage-blob';

// ── Types (subset of PersistedEvent) ─────────────────────────────────────────

interface PersistedEvent {
  id: string;
  projectId: string;
  type: string;
  payload: unknown;
  timestamp: string;
  userId: string;
  note?: string;
}

interface ProjectListItem {
  projectId: string;
  title: string;
  createdAt: string;
  blockCount: number;
}

// ── Args ──────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

function getFlag(name: string): string | undefined {
  const idx = args.indexOf(name);
  return idx !== -1 ? args[idx + 1] : undefined;
}

function hasFlag(name: string): boolean {
  return args.includes(name);
}

const projectId = getFlag('--project');
const doPull = hasFlag('--pull');
const doPush = hasFlag('--push');

if (!projectId) {
  console.error('Error: --project <projectId> is required');
  process.exit(1);
}

const localConn = process.env.LOCAL_CONN;
const prodConn = process.env.PROD_CONN;

if (!localConn) {
  console.error('Error: LOCAL_CONN env var is not set (use "UseDevelopmentStorage=true" for Azurite)');
  process.exit(1);
}
if (!prodConn) {
  console.error('Error: PROD_CONN env var is not set');
  process.exit(1);
}

// ── Storage helpers ───────────────────────────────────────────────────────────

function getEventBlob(connStr: string, projId: string): BlockBlobClient {
  return BlobServiceClient
    .fromConnectionString(connStr)
    .getContainerClient('planning-data')
    .getBlockBlobClient(`projects/${projId}/events.json`);
}

function getSnapshotBlob(connStr: string, projId: string): BlockBlobClient {
  return BlobServiceClient
    .fromConnectionString(connStr)
    .getContainerClient('planning-data')
    .getBlockBlobClient(`projects/${projId}/snapshot.json`);
}

async function readEvents(connStr: string, projId: string): Promise<PersistedEvent[]> {
  const blob = getEventBlob(connStr, projId);
  try {
    const download = await blob.download();
    const chunks: Buffer[] = [];
    for await (const chunk of download.readableStreamBody!) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf-8')) as PersistedEvent[];
  } catch (err: any) {
    if (err.statusCode === 404) return [];
    throw err;
  }
}

async function writeEvents(connStr: string, projId: string, events: PersistedEvent[]): Promise<void> {
  const blob = getEventBlob(connStr, projId);
  const body = JSON.stringify(events, null, 2);
  await blob.upload(body, Buffer.byteLength(body, 'utf-8'), {
    blobHTTPHeaders: { blobContentType: 'application/json; charset=utf-8' },
    conditions: {},
  });
}

async function deleteSnapshot(connStr: string, projId: string): Promise<void> {
  try {
    await getSnapshotBlob(connStr, projId).delete();
  } catch {
    // snapshot may not exist — that's fine
  }
}

// ── Chapter drafts ────────────────────────────────────────────────────────────

interface DraftBlob {
  exists: boolean;
  content: string;
  lastModified?: Date;
}

function getDraftBlob(connStr: string, projId: string, chapterId: string): BlockBlobClient {
  return BlobServiceClient
    .fromConnectionString(connStr)
    .getContainerClient('planning-data')
    .getBlockBlobClient(`projects/${projId}/chapters/${chapterId}/draft.md`);
}

async function readDraft(connStr: string, projId: string, chapterId: string): Promise<DraftBlob> {
  const blob = getDraftBlob(connStr, projId, chapterId);
  try {
    const download = await blob.download();
    const chunks: Buffer[] = [];
    for await (const chunk of download.readableStreamBody!) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return { exists: true, content: Buffer.concat(chunks).toString('utf-8'), lastModified: download.lastModified };
  } catch (err: any) {
    if (err.statusCode === 404) return { exists: false, content: '' };
    throw err;
  }
}

async function writeDraft(connStr: string, projId: string, chapterId: string, content: string): Promise<void> {
  const blob = getDraftBlob(connStr, projId, chapterId);
  await blob.upload(content, Buffer.byteLength(content, 'utf-8'), {
    blobHTTPHeaders: { blobContentType: 'text/plain; charset=utf-8' },
    conditions: {},
  });
}

// Chapter ids that have a draft.md, derived from the project's event log.
function getChapterIds(events: PersistedEvent[]): string[] {
  const ids = new Set<string>();
  for (const e of events) {
    if (e.type === 'ChapterCreated' || e.type === 'ChapterPromoted') {
      ids.add((e.payload as { chapterId: string }).chapterId);
    }
  }
  return [...ids];
}

// ── User index ──────────────────────────────────────────────────────────────

function getIndexBlob(connStr: string, username: string): BlockBlobClient {
  return BlobServiceClient
    .fromConnectionString(connStr)
    .getContainerClient('planning-data')
    .getBlockBlobClient(`users/${username}/index.json`);
}

async function readIndex(connStr: string, username: string): Promise<ProjectListItem[]> {
  const blob = getIndexBlob(connStr, username);
  try {
    const download = await blob.download();
    const chunks: Buffer[] = [];
    for await (const chunk of download.readableStreamBody!) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf-8')) as ProjectListItem[];
  } catch (err: any) {
    if (err.statusCode === 404) return [];
    throw err;
  }
}

async function writeIndex(connStr: string, username: string, items: ProjectListItem[]): Promise<void> {
  const blob = getIndexBlob(connStr, username);
  const body = JSON.stringify(items, null, 2);
  await blob.upload(body, Buffer.byteLength(body, 'utf-8'), {
    blobHTTPHeaders: { blobContentType: 'application/json; charset=utf-8' },
    conditions: {},
  });
}

// Derives the project's list-item metadata from its event log. Returns null
// if the log doesn't contain a ProjectCreated event (nothing to index yet).
function deriveProjectListItem(projId: string, events: PersistedEvent[]): ProjectListItem | null {
  const created = events.find(e => e.type === 'ProjectCreated');
  if (!created) return null;
  const blockCount = events.filter(e => e.type === 'BlockCreated' || e.type === 'ChapterCreated').length;
  return {
    projectId: projId,
    title: (created.payload as { title: string }).title,
    createdAt: created.timestamp,
    blockCount,
  };
}

function getAuthorUsername(events: PersistedEvent[]): string | undefined {
  const created = events.find(e => e.type === 'ProjectCreated');
  return created ? (created.payload as { authorUsername: string }).authorUsername : undefined;
}

// Adds the project to the user's index if it isn't already listed.
// Returns true if an entry was added.
async function ensureIndexEntry(connStr: string, username: string, item: ProjectListItem): Promise<boolean> {
  const items = await readIndex(connStr, username);
  if (items.some(i => i.projectId === item.projectId)) return false;
  items.push(item);
  await writeIndex(connStr, username, items);
  return true;
}

// ── Sync ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nSyncing project: ${projectId}`);
  console.log('Reading events from both stores…\n');

  const [localEvents, remoteEvents] = await Promise.all([
    readEvents(localConn!, projectId!),
    readEvents(prodConn!, projectId!),
  ]);

  const localIds = new Set(localEvents.map(e => e.id));
  const remoteIds = new Set(remoteEvents.map(e => e.id));

  const toPull = remoteEvents.filter(e => !localIds.has(e.id));
  const toPush = localEvents.filter(e => !remoteIds.has(e.id));

  console.log(`Local:  ${localEvents.length} events`);
  console.log(`Remote: ${remoteEvents.length} events`);
  console.log(`To pull (remote → local): ${toPull.length}`);
  console.log(`To push (local → remote): ${toPush.length}`);

  if (!doPull && !doPush) {
    console.log('\nDry run — pass --pull and/or --push to write changes.');
    return;
  }

  if (doPull && toPull.length > 0) {
    console.log(`\nPulling ${toPull.length} event(s) to local…`);
    const merged = [...localEvents, ...toPull].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
    await writeEvents(localConn!, projectId!, merged);
    await deleteSnapshot(localConn!, projectId!);
    console.log(`  ✓ Written to Azurite (snapshot invalidated)`);
  } else if (doPull) {
    console.log('\nNothing to pull.');
  }

  if (doPush && toPush.length > 0) {
    console.log(`\nPushing ${toPush.length} event(s) to production…`);
    const merged = [...remoteEvents, ...toPush].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
    await writeEvents(prodConn!, projectId!, merged);
    await deleteSnapshot(prodConn!, projectId!);
    console.log(`  ✓ Written to production (snapshot invalidated)`);
  } else if (doPush) {
    console.log('\nNothing to push.');
  }

  // Ensure the project shows up in the owner's project list on each synced
  // side — sync only writes events.json and never touches
  // users/{username}/index.json on its own. This runs regardless of whether
  // there were new events this run, since a project's index entry can be
  // missing even when its events were fully synced previously.
  const allEvents = new Map<string, PersistedEvent>();
  [...localEvents, ...remoteEvents].forEach(e => allEvents.set(e.id, e));
  const listItem = deriveProjectListItem(projectId!, [...allEvents.values()]);
  const authorUsername = getAuthorUsername([...allEvents.values()]);

  if (!listItem || !authorUsername) {
    console.log('\nNo ProjectCreated event found — skipping project list sync.');
  } else {
    if (doPull) {
      const added = await ensureIndexEntry(localConn!, authorUsername, listItem);
      if (added) console.log(`  ✓ Added "${listItem.title}" to local index for ${authorUsername}`);
    }
    if (doPush) {
      const added = await ensureIndexEntry(prodConn!, authorUsername, listItem);
      if (added) console.log(`  ✓ Added "${listItem.title}" to production index for ${authorUsername}`);
    }
  }

  // Sync chapter draft.md files. These aren't part of the event log, so they
  // can't be merged — for each chapter, whichever side has the newer
  // lastModified wins and is copied to the other side (subject to --pull/--push).
  const chapterIds = getChapterIds([...allEvents.values()]);
  for (const chapterId of chapterIds) {
    const [localDraft, remoteDraft] = await Promise.all([
      readDraft(localConn!, projectId!, chapterId),
      readDraft(prodConn!, projectId!, chapterId),
    ]);

    if (localDraft.content === remoteDraft.content) continue;

    const remoteIsNewer = !localDraft.exists
      || (remoteDraft.exists && remoteDraft.lastModified! > localDraft.lastModified!);
    const localIsNewer = !remoteDraft.exists
      || (localDraft.exists && localDraft.lastModified! > remoteDraft.lastModified!);

    if (doPull && remoteIsNewer) {
      await writeDraft(localConn!, projectId!, chapterId, remoteDraft.content);
      console.log(`  ✓ Pulled draft for chapter ${chapterId}`);
    } else if (doPush && localIsNewer) {
      await writeDraft(prodConn!, projectId!, chapterId, localDraft.content);
      console.log(`  ✓ Pushed draft for chapter ${chapterId}`);
    }
  }

  console.log('\nDone.');
}

main().catch(err => {
  console.error('Sync failed:', err);
  process.exit(1);
});
