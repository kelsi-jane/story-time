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

  console.log('\nDone.');
}

main().catch(err => {
  console.error('Sync failed:', err);
  process.exit(1);
});
