import type { ProjectListItem, Projection, WritingEvent } from '../types';

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

export async function getChapterDraft(projectId: string, chapterId: string): Promise<string> {
  const res = await fetch(`/api/planning/projects/${projectId}/chapters/${chapterId}/draft`);
  if (!res.ok) return '';
  return res.text();
}

export async function saveChapterDraft(projectId: string, chapterId: string, content: string): Promise<void> {
  await fetch(`/api/planning/projects/${projectId}/chapters/${chapterId}/draft`, {
    method: 'PUT',
    headers: { 'Content-Type': 'text/plain' },
    body: content,
  });
}
