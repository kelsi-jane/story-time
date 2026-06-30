import type { ProjectListItem, Projection, WritingEvent, PersistedEvent } from '../types';

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`/api/planning/${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `API error ${res.status}`);
  }
  return res.json();
}

export class DraftConflictError extends Error {
  constructor() {
    super('conflict');
    this.name = 'DraftConflictError';
  }
}

export async function createProject(
  username: string,
  title: string,
  templateId: string,
): Promise<{ projectId: string }> {
  return apiFetch(`users/${username}/projects`, {
    method: 'POST',
    body: JSON.stringify({ title, templateId }),
  });
}

export async function listProjects(username: string): Promise<ProjectListItem[]> {
  const data = await apiFetch(`users/${username}/projects`);
  return data.projects ?? [];
}

export async function appendEvent(
  projectId: string,
  event: WritingEvent & { note?: string },
): Promise<void> {
  await apiFetch(`projects/${projectId}/events`, {
    method: 'POST',
    body: JSON.stringify(event),
  });
}

export async function getProjection(projectId: string): Promise<Projection> {
  return apiFetch(`projects/${projectId}/projection`);
}

export async function getProjectEvents(projectId: string): Promise<PersistedEvent[]> {
  const data = await apiFetch(`projects/${projectId}/events`);
  return data.events ?? [];
}

export async function getChapterDraft(projectId: string, chapterId: string): Promise<{ content: string; etag: string | null }> {
  const res = await fetch(`/api/planning/projects/${projectId}/chapters/${chapterId}/draft`);
  if (!res.ok) return { content: '', etag: null };
  const content = await res.text();
  const etag = res.headers.get('ETag');
  return { content, etag };
}

export async function saveChapterDraft(
  projectId: string,
  chapterId: string,
  content: string,
  etag?: string | null,
  createSnapshot?: boolean,
  note?: string,
): Promise<{ etag: string | null }> {
  const url = new URL(`/api/planning/projects/${projectId}/chapters/${chapterId}/draft`, window.location.origin);
  if (createSnapshot) url.searchParams.set('snapshot', 'true');

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (etag) headers['If-Match'] = etag;

  const body: { content: string; note?: string } = { content };
  if (createSnapshot && note) body.note = note;

  const res = await fetch(url.toString(), {
    method: 'PUT',
    headers,
    body: JSON.stringify(body),
  });

  if (res.status === 412) throw new DraftConflictError();
  if (!res.ok) throw new Error(`Save failed: ${res.status}`);

  const result = await res.json().catch(() => ({}));
  return { etag: result.etag ?? null };
}

export async function getChapterDraftHistory(projectId: string, chapterId: string): Promise<PersistedEvent[]> {
  const res = await fetch(`/api/planning/projects/${projectId}/chapters/${chapterId}/history`);
  if (!res.ok) return [];
  const data = await res.json().catch(() => ({}));
  return data.history ?? [];
}

export async function getChapterDraftSnapshot(projectId: string, chapterId: string, snapshotId: string): Promise<string> {
  const res = await fetch(`/api/planning/projects/${projectId}/chapters/${chapterId}/snapshots/${snapshotId}`);
  if (!res.ok) return '';
  return res.text();
}

export async function deleteChapterDraftSnapshot(projectId: string, chapterId: string, snapshotId: string): Promise<void> {
  const res = await fetch(`/api/planning/projects/${projectId}/chapters/${chapterId}/snapshots/${snapshotId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
}
