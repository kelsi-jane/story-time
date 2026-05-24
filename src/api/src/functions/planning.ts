import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { randomUUID } from 'crypto';
import { isAdmin, getCallerUsername } from '../lib/table-client';
import {
  appendEvent, replayEvents, getUserIndex, updateUserIndex,
  PersistedEvent, SlotArea,
} from '../lib/event-store';

// ── Template slot definitions (outline slots only — board zones are always seeded) ──

const BOARD_ZONES: Array<{ id: string; label: string; order: number }> = [
  { id: 'loose-ideas',  label: 'loose ideas',    order: 0 },
  { id: 'characters',   label: 'characters',     order: 1 },
  { id: 'scenes-beats', label: 'scenes / beats', order: 2 },
  { id: 'parking-lot',  label: 'parking lot',    order: 3 },
  { id: 'unplaced',     label: 'unplaced',       order: 4 },
];

const TEMPLATE_SLOTS: Record<string, Array<{ id: string; label: string; order: number }>> = {
  '7-point': [
    { id: 'hook',         label: 'hook',         order: 0 },
    { id: 'plot-turn-1',  label: 'plot turn 1',  order: 1 },
    { id: 'pinch-1',      label: 'pinch 1',      order: 2 },
    { id: 'midpoint',     label: 'midpoint',     order: 3 },
    { id: 'pinch-2',      label: 'pinch 2',      order: 4 },
    { id: 'plot-turn-2',  label: 'plot turn 2',  order: 5 },
    { id: 'resolution',   label: 'resolution',   order: 6 },
  ],
  '3-act': [
    { id: 'act-1', label: 'act 1 — setup',         order: 0 },
    { id: 'act-2', label: 'act 2 — confrontation', order: 1 },
    { id: 'act-3', label: 'act 3 — resolution',    order: 2 },
  ],
  'save-the-cat': [
    { id: 'stc-opening-image',    label: 'opening image',     order: 0 },
    { id: 'stc-theme-stated',     label: 'theme stated',      order: 1 },
    { id: 'stc-setup',            label: 'setup',             order: 2 },
    { id: 'stc-catalyst',         label: 'catalyst',          order: 3 },
    { id: 'stc-debate',           label: 'debate',            order: 4 },
    { id: 'stc-break-into-two',   label: 'break into two',   order: 5 },
    { id: 'stc-b-story',          label: 'b story',           order: 6 },
    { id: 'stc-fun-and-games',    label: 'fun and games',     order: 7 },
    { id: 'stc-midpoint',         label: 'midpoint',          order: 8 },
    { id: 'stc-bad-guys-close',   label: 'bad guys close in', order: 9 },
    { id: 'stc-all-is-lost',      label: 'all is lost',       order: 10 },
    { id: 'stc-dark-night',       label: 'dark night of soul',order: 11 },
    { id: 'stc-break-into-three', label: 'break into three',  order: 12 },
    { id: 'stc-finale',           label: 'finale',            order: 13 },
    { id: 'stc-closing-image',    label: 'closing image',     order: 14 },
  ],
  'heros-journey': [
    { id: 'hj-ordinary-world',    label: 'ordinary world',       order: 0 },
    { id: 'hj-call',              label: 'call to adventure',    order: 1 },
    { id: 'hj-refusal',           label: 'refusal of the call',  order: 2 },
    { id: 'hj-mentor',            label: 'meeting the mentor',   order: 3 },
    { id: 'hj-threshold',         label: 'crossing the threshold',order: 4 },
    { id: 'hj-tests',             label: 'tests, allies, enemies',order: 5 },
    { id: 'hj-approach',          label: 'approach',             order: 6 },
    { id: 'hj-ordeal',            label: 'the ordeal',           order: 7 },
    { id: 'hj-reward',            label: 'reward',               order: 8 },
    { id: 'hj-road-back',         label: 'the road back',        order: 9 },
    { id: 'hj-resurrection',      label: 'resurrection',         order: 10 },
    { id: 'hj-return',            label: 'return with the elixir',order: 11 },
  ],
  'freytag': [
    { id: 'ft-exposition',     label: 'exposition',     order: 0 },
    { id: 'ft-rising-action',  label: 'rising action',  order: 1 },
    { id: 'ft-climax',         label: 'climax',         order: 2 },
    { id: 'ft-falling-action', label: 'falling action', order: 3 },
    { id: 'ft-denouement',     label: 'denouement',     order: 4 },
  ],
  'fichtean': [
    { id: 'fc-crisis',          label: 'crisis',         order: 0 },
    { id: 'fc-complications',   label: 'complications',  order: 1 },
    { id: 'fc-climax',          label: 'climax',         order: 2 },
    { id: 'fc-resolution',      label: 'resolution',     order: 3 },
  ],
  'blank': [],
};

// ── Handlers ──────────────────────────────────────────────────────────────────

async function createProject(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  if (!isAdmin(request)) return { status: 401, jsonBody: { message: 'Unauthorized' } };

  const username = request.params.username;
  const caller = getCallerUsername(request);
  const isDev = process.env.AZURE_FUNCTIONS_ENVIRONMENT === 'Development';
  if (!isDev && caller && caller !== username) {
    return { status: 403, jsonBody: { message: 'Forbidden' } };
  }

  let body: { title?: string; templateId?: string };
  try {
    body = await request.json() as { title?: string; templateId?: string };
  } catch {
    return { status: 400, jsonBody: { message: 'Invalid JSON body' } };
  }

  const { title, templateId = 'blank' } = body;
  if (!title?.trim()) return { status: 400, jsonBody: { message: 'title is required' } };

  const projectId = `proj_${randomUUID().replace(/-/g, '').slice(0, 10)}`;
  const now = new Date().toISOString();
  const authorUsername = caller ?? username;

  const seedEvents: PersistedEvent[] = [];

  const stamp = (ev: Omit<PersistedEvent, 'id' | 'projectId' | 'timestamp' | 'userId'>): PersistedEvent => ({
    ...ev,
    id: `evt_${randomUUID().replace(/-/g, '').slice(0, 10)}`,
    projectId,
    timestamp: now,
    userId: authorUsername,
  } as PersistedEvent);

  seedEvents.push(stamp({ type: 'ProjectCreated', payload: { title: title.trim(), authorUsername, templateId } }));

  for (const zone of BOARD_ZONES) {
    seedEvents.push(stamp({ type: 'SlotAdded', payload: { slotId: zone.id, label: zone.label, area: 'board' as SlotArea, order: zone.order } }));
  }

  const templateSlots = TEMPLATE_SLOTS[templateId] ?? [];
  for (const slot of templateSlots) {
    seedEvents.push(stamp({ type: 'SlotAdded', payload: { slotId: slot.id, label: slot.label, area: 'outline' as SlotArea, order: slot.order } }));
  }

  try {
    for (const ev of seedEvents) {
      await appendEvent(projectId, ev);
    }

    await updateUserIndex(username, (items) => [
      ...items,
      { projectId, title: title.trim(), createdAt: now, blockCount: 0 },
    ]);

    return { status: 201, jsonBody: { projectId } };
  } catch (err: any) {
    context.error('createProject error:', err);
    return { status: 500, jsonBody: { message: 'Failed to create project' } };
  }
}

async function listProjects(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  if (!isAdmin(request)) return { status: 401, jsonBody: { message: 'Unauthorized' } };

  const username = request.params.username;
  try {
    const projects = await getUserIndex(username);
    return { status: 200, jsonBody: { projects } };
  } catch (err: any) {
    context.error('listProjects error:', err);
    return { status: 500, jsonBody: { message: 'Failed to list projects' } };
  }
}

async function appendProjectEvent(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  if (!isAdmin(request)) return { status: 401, jsonBody: { message: 'Unauthorized' } };

  const projectId = request.params.projectId;
  const caller = getCallerUsername(request) ?? 'unknown';

  let body: Partial<PersistedEvent>;
  try {
    body = await request.json() as Partial<PersistedEvent>;
  } catch {
    return { status: 400, jsonBody: { message: 'Invalid JSON body' } };
  }

  if (!body.type) return { status: 400, jsonBody: { message: 'event type is required' } };

  const event: PersistedEvent = {
    ...body,
    id: `evt_${randomUUID().replace(/-/g, '').slice(0, 10)}`,
    projectId,
    timestamp: new Date().toISOString(),
    userId: caller,
  } as PersistedEvent;

  try {
    await appendEvent(projectId, event);
    return { status: 200, jsonBody: { ok: true, eventId: event.id } };
  } catch (err: any) {
    context.error('appendProjectEvent error:', err);
    return { status: 500, jsonBody: { message: 'Failed to append event' } };
  }
}

async function getProjection(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  if (!isAdmin(request)) return { status: 401, jsonBody: { message: 'Unauthorized' } };

  const projectId = request.params.projectId;
  try {
    const projection = await replayEvents(projectId);
    return { status: 200, jsonBody: projection };
  } catch (err: any) {
    context.error('getProjection error:', err);
    return { status: 500, jsonBody: { message: 'Failed to load projection' } };
  }
}

// ── Registration ──────────────────────────────────────────────────────────────

app.http('createProject', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'planning/users/{username}/projects',
  handler: createProject,
});

app.http('listProjects', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'planning/users/{username}/projects',
  handler: listProjects,
});

app.http('appendProjectEvent', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'planning/projects/{projectId}/events',
  handler: appendProjectEvent,
});

app.http('getProjection', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'planning/projects/{projectId}/projection',
  handler: getProjection,
});
